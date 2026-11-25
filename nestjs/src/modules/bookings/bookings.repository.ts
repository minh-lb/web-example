import { Injectable } from '@nestjs/common';
import { Database, Sql } from '../../database/database.service';
import { fail } from '../../common/http-error';
import { randomBytes } from 'node:crypto';
import { bookingInput, canTransition } from './booking.policy';
import { bookingColumns, bookingJoin, bookingData } from './booking.mapper';
import { today } from '../../common/validation';
@Injectable()
export class BookingsRepository {
  constructor(private readonly db: Database) {}
  async booking(id:number,c?:Sql) { const [r]=await this.db.rows('SELECT '+bookingColumns+bookingJoin+' WHERE b.id=?',[id],c); return r?bookingData(r):fail(404,'Booking not found'); }
  async bookings(page:number,search:string,status:string,oldest:boolean) {
    const conditions:string[]=[],args:any[]=[];
    if(search){conditions.push('(b.reference LIKE ? OR c.name LIKE ? OR s.name LIKE ?)');args.push(...Array(3).fill('%'+search+'%'));}
    if(status&&status!=='All'){conditions.push('b.status=?');args.push(status);}
    const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
    const order=oldest?' ASC':' DESC';
    const total=await this.db.count('SELECT COUNT(*) AS total'+bookingJoin+where,args);
    const items=(await this.db.rows('SELECT '+bookingColumns+bookingJoin+where+' ORDER BY b.created_at'+order+',b.id'+order+' LIMIT 8 OFFSET ?',[...args,(page-1)*8])).map(bookingData);
    return {items,total,page,pageSize:8};
  }
  async createBooking(input:ReturnType<typeof bookingInput>,actor:string) {
    const booking=await this.db.transaction(async c=>{
      const [service]=await this.db.rows('SELECT id,active FROM services WHERE id=? FOR UPDATE',[input.serviceId],c);
      if(!service?.active) fail(400,'The selected service is unavailable.');
      if((await this.db.rows('SELECT id FROM bookings WHERE service_id=? AND date=? AND time_slot=? AND status<>? FOR UPDATE',[input.serviceId,input.date,input.timeSlot,'CANCELED'],c)).length) fail(409,'This time is already booked. Choose another slot.');
      await this.db.write('INSERT INTO customers (name,email,phone,created_at,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE name=VALUES(name),phone=VALUES(phone),updated_at=CURRENT_TIMESTAMP',[input.customerName,input.customerEmail,input.customerPhone],c);
      const [customer]=await this.db.rows('SELECT id FROM customers WHERE email=?',[input.customerEmail],c);
      const r=await this.db.write('INSERT INTO bookings (reference,service_id,customer_id,date,time_slot,notes,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',['BK-'+randomBytes(4).toString('hex').toUpperCase(),input.serviceId,customer.id,input.date,input.timeSlot,input.notes,actor],c);
      await this.db.write('INSERT INTO background_jobs (type,booking_id,created_at,updated_at) VALUES (?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',['BOOKING_CONFIRMATION',r.insertId],c);
      return this.booking(r.insertId,c);
    });
    await this.db.invalidateServices(); return booking;
  }
  async changeBooking(id:number,status:string) {
    return this.db.transaction(async c=>{
      const [r]=await this.db.rows('SELECT status FROM bookings WHERE id=? FOR UPDATE',[id],c);
      if(!r) fail(404,'Booking not found');
      if(!canTransition(r.status,status)) fail(409,'This booking can no longer change status');
      await this.db.write('UPDATE bookings SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[status,id],c);
      return this.booking(id,c);
    });
  }
  async availability(serviceId:number,date:string) { return {booked:(await this.db.rows('SELECT time_slot FROM bookings WHERE service_id=? AND date=? AND status<>?',[serviceId,date,'CANCELED'])).map(r=>r.time_slot)}; }
  async recent() { return (await this.db.rows('SELECT '+bookingColumns+bookingJoin+' ORDER BY b.created_at DESC,b.id DESC LIMIT 5')).map(bookingData); }
  async total() { return this.db.count('SELECT COUNT(*) AS total FROM bookings'); }
  async upcoming() { return this.db.count('SELECT COUNT(*) AS total FROM bookings WHERE status=? AND date>=?',['CONFIRMED',today()]); }
}
