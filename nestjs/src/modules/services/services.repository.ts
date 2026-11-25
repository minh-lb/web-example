import { Injectable } from '@nestjs/common';
import { Database, Sql } from '../../database/database.service';
import { fail } from '../../common/http-error';
import { randomBytes } from 'node:crypto';
import { serviceData } from './service.mapper';
const serviceColumns = 's.*, (SELECT COUNT(*) FROM bookings WHERE service_id=s.id) AS bookings_count';

@Injectable()
export class ServicesRepository {
  constructor(private readonly db: Database) {}
  async service(id:number,c?:Sql) { const [r]=await this.db.rows('SELECT '+serviceColumns+' FROM services s WHERE s.id=?',[id],c); return r?serviceData(r):fail(404,'Service not found'); }
  async services(page:number,size:number,search:string,category:string,active:boolean) {
    return this.db.cached(JSON.stringify([page,size,search,category,active]),async()=>{
      const conditions:string[]=[], args:any[]=[];
      if(search){conditions.push('(s.name LIKE ? OR s.description LIKE ?)');args.push('%'+search+'%','%'+search+'%');}
      if(category && category!=='All'){conditions.push('s.category=?');args.push(category);}
      if(active) conditions.push('s.active=1');
      const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
      const total=await this.db.count('SELECT COUNT(*) AS total FROM services s'+where,args);
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
}
