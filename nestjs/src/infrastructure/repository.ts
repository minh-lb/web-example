import { Injectable } from '@nestjs/common';
import { Database, Row, Sql } from './database';
import { bookingInput, canTransition, demoFailures, fail, JOB_STATUSES, today } from '../domain/policy';
import { randomBytes } from 'node:crypto';

const serviceColumns = 's.*, (SELECT COUNT(*) FROM bookings WHERE service_id=s.id) AS bookings_count';
const bookingColumns = 'b.*, s.slug AS s_slug,s.name AS s_name,s.description AS s_description,s.category AS s_category,s.duration_minutes AS s_duration_minutes,s.price AS s_price,s.color AS s_color,s.active AS s_active,s.created_at AS s_created_at,(SELECT COUNT(*) FROM bookings WHERE service_id=s.id) AS s_bookings_count,c.name AS c_name,c.email AS c_email,c.phone AS c_phone';
const bookingJoin = ' FROM bookings b JOIN services s ON s.id=b.service_id JOIN customers c ON c.id=b.customer_id';
const jobJoin = ' FROM background_jobs j LEFT JOIN bookings b ON b.id=j.booking_id';
const iso = (v:any) => v == null ? null : new Date(v).toISOString();
function serviceData(r:Record<string,any>) {
  return {id:Number(r.id),slug:r.slug,name:r.name,description:r.description,category:r.category,durationMinutes:Number(r.duration_minutes),price:Number(r.price),color:r.color,active:Boolean(r.active),createdAt:iso(r.created_at),_count:{bookings:Number(r.bookings_count)}};
}
function bookingData(r:Row) {
  return {id:Number(r.id),reference:r.reference,serviceId:Number(r.service_id),customerId:Number(r.customer_id),date:r.date,timeSlot:r.time_slot,status:r.status,notes:r.notes,createdBy:r.created_by,createdAt:iso(r.created_at),updatedAt:iso(r.updated_at),
    service:serviceData({id:r.service_id,...Object.fromEntries(Object.entries(r).filter(([k])=>k.startsWith('s_')).map(([k,v])=>[k.slice(2),v]))}),
    customer:{id:Number(r.customer_id),name:r.c_name,email:r.c_email,phone:r.c_phone}};
}
function jobData(r:Row) {
  return {id:Number(r.id),type:r.type,bookingId:r.booking_id==null?null:Number(r.booking_id),booking:r.reference?{reference:r.reference}:null,status:r.status,attempts:Number(r.attempts),maxAttempts:Number(r.max_attempts),failUntilAttempt:Number(r.fail_until_attempt),lastError:r.last_error,result:r.result,completedAt:iso(r.completed_at),createdAt:iso(r.created_at)};
}
@Injectable()
export class Repository {
  constructor(private readonly db:Database) {}
  async count(sql:string,args:any[]=[],c?:Sql) { return Number((await this.db.rows(sql,args,c))[0].total); }
  async service(id:number,c?:Sql) { const [r]=await this.db.rows('SELECT '+serviceColumns+' FROM services s WHERE s.id=?',[id],c); return r?serviceData(r):fail(404,'Service not found'); }
  async services(page:number,size:number,search:string,category:string,active:boolean) {
    return this.db.cached(JSON.stringify([page,size,search,category,active]),async()=>{
      const conditions:string[]=[], args:any[]=[];
      if(search){conditions.push('(s.name LIKE ? OR s.description LIKE ?)');args.push('%'+search+'%','%'+search+'%');}
      if(category && category!=='All'){conditions.push('s.category=?');args.push(category);}
      if(active) conditions.push('s.active=1');
      const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
      const total=await this.count('SELECT COUNT(*) AS total FROM services s'+where,args);
      const items=(await this.db.rows('SELECT '+serviceColumns+' FROM services s'+where+' ORDER BY s.created_at,s.id LIMIT ? OFFSET ?',[...args,size,(page-1)*size])).map(serviceData);
      return {items,total,page,pageSize:size};
    });
  }
  async createService(input:Record<string,any>) {
    const slug=String(input.name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+randomBytes(4).toString('hex');
    const r=await this.db.write('INSERT INTO services SET ?',[{...input,slug,created_at:new Date(),updated_at:new Date()}]); await this.db.invalidateServices(); return this.service(r.insertId);
  }
  async updateService(id:number,input:Record<string,any>) {
    await this.service(id); if(Object.keys(input).length) await this.db.write('UPDATE services SET ? WHERE id=?',[{...input,updated_at:new Date()},id]);
    await this.db.invalidateServices(); return this.service(id);
  }
  async booking(id:number,c?:Sql) { const [r]=await this.db.rows('SELECT '+bookingColumns+bookingJoin+' WHERE b.id=?',[id],c); return r?bookingData(r):fail(404,'Booking not found'); }
  async bookings(page:number,search:string,status:string,oldest:boolean) {
    const conditions:string[]=[],args:any[]=[];
    if(search){conditions.push('(b.reference LIKE ? OR c.name LIKE ? OR s.name LIKE ?)');args.push(...Array(3).fill('%'+search+'%'));}
    if(status&&status!=='All'){conditions.push('b.status=?');args.push(status);}
    const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
    const order=oldest?' ASC':' DESC';
    const total=await this.count('SELECT COUNT(*) AS total'+bookingJoin+where,args);
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
  async dashboard() {
    const bookings=(await this.db.rows('SELECT '+bookingColumns+bookingJoin+' ORDER BY b.created_at DESC,b.id DESC LIMIT 5')).map(bookingData);
    return {bookings,totalBookings:await this.count('SELECT COUNT(*) AS total FROM bookings'),upcoming:await this.count('SELECT COUNT(*) AS total FROM bookings WHERE status=? AND date>=?',['CONFIRMED',today()]),activeServices:await this.count('SELECT COUNT(*) AS total FROM services WHERE active=1'),clients:await this.count('SELECT COUNT(*) AS total FROM customers')};
  }
  async job(id:number,c?:Sql) { const [r]=await this.db.rows('SELECT j.*,b.reference'+jobJoin+' WHERE j.id=?',[id],c); return r?jobData(r):fail(404,'Job not found'); }
  async queue(status:string,page:number) {
    const counts:Record<string,number>=Object.fromEntries(JOB_STATUSES.map(s=>[s,0]));
    for(const r of await this.db.rows('SELECT status,COUNT(*) AS total FROM background_jobs GROUP BY status')) counts[r.status]=Number(r.total);
    const where=status==='ALL'?'':' WHERE j.status=?', args=status==='ALL'?[]:[status];
    const total=await this.count('SELECT COUNT(*) AS total FROM background_jobs j'+where,args);
    const totalPages=Math.max(1,Math.ceil(total/100)); page=Math.min(page,totalPages);
    const items=(await this.db.rows('SELECT j.*,b.reference'+jobJoin+where+' ORDER BY j.created_at DESC,j.id DESC LIMIT 100 OFFSET ?',[...args,(page-1)*100])).map(jobData);
    return {items,counts,page,totalPages,total};
  }
  async enqueue(scenario:string) {
    const r=await this.db.write('INSERT INTO background_jobs (type,fail_until_attempt,created_at,updated_at) VALUES (?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',['DEMO',demoFailures(scenario)]); return this.job(r.insertId);
  }
  async retry(id:number) {
    return this.db.transaction(async c=>{
      const [r]=await this.db.rows('SELECT status FROM background_jobs WHERE id=? FOR UPDATE',[id],c);
      if(!r) fail(404,'Job not found');
      if(r.status!=='FAILED') fail(409,'Only failed jobs can be retried');
      await this.db.write('UPDATE background_jobs SET status="PENDING",attempts=0,fail_until_attempt=0,last_error=NULL,result=NULL,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?',[id],c);
      return this.job(id,c);
    });
  }
}
