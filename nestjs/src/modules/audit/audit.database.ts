import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { createPool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// Separate connection budget: audit traffic cannot occupy business pool slots.
@Injectable()
export class AuditDatabase implements OnApplicationShutdown {
  private readonly pool = createPool({
    host:process.env.DB_HOST || 'mysql',port:Number(process.env.DB_PORT || 3306),
    database:process.env.DB_DATABASE || 'web_example',user:process.env.DB_USERNAME || 'web_example',
    password:process.env.DB_PASSWORD || 'local-web-example-password',timezone:'Z',supportBigNumbers:true,
    connectionLimit:2,queueLimit:8,connectTimeout:2000,
  });
  async write(sql:string,params:any[]=[]):Promise<ResultSetHeader> {
    const [result] = await this.pool.query<ResultSetHeader>({sql,timeout:2000},params);
    return result;
  }
  async rows(sql:string,params:any[]=[]):Promise<RowDataPacket[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>({sql,timeout:5000},params);
    return rows;
  }
  async count(sql:string,params:any[]=[]):Promise<number> {
    return Number((await this.rows(sql,params))[0].total);
  }
  async onApplicationShutdown() { await this.pool.end(); }
}
