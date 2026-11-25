import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import Redis from 'ioredis';

export type Row = RowDataPacket & Record<string, any>;
export type Sql = Pick<PoolConnection,'query'>;
@Injectable()
export class Database implements OnModuleDestroy {
  readonly pool = createPool({host:process.env.DB_HOST || 'mysql',port:Number(process.env.DB_PORT || 3306),database:process.env.DB_DATABASE || 'web_example',user:process.env.DB_USERNAME || 'web_example',password:process.env.DB_PASSWORD || 'local-web-example-password',timezone:'Z',connectionLimit:10,supportBigNumbers:true});
  readonly redis = new Redis({host:process.env.REDIS_HOST || 'redis',port:Number(process.env.REDIS_PORT || 6379),maxRetriesPerRequest:1,enableOfflineQueue:false});
  constructor() { this.redis.on('error', error => console.error('Redis:',error.message)); }
  async rows(sql:string, params:any[] = [], conn:Sql = this.pool): Promise<Row[]> { const [rows] = await conn.query<Row[]>(sql,params); return rows; }
  async write(sql:string, params:any[] = [], conn:Sql = this.pool): Promise<ResultSetHeader> { const [result] = await conn.query<ResultSetHeader>(sql,params); return result; }
  async transaction<T>(run:(conn:PoolConnection)=>Promise<T>):Promise<T> {
    const conn = await this.pool.getConnection();
    try { await conn.beginTransaction(); const result = await run(conn); await conn.commit(); return result; }
    catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }
  async cached<T>(key:string, load:()=>Promise<T>):Promise<T> {
    let cacheKey:string;
    try { const version = await this.redis.get('services:version') || '0'; cacheKey = 'services:'+version+':'+key; const hit = await this.redis.get(cacheKey); if(hit) return JSON.parse(hit) as T; }
    catch { return load(); }
    const result = await load();
    try { await this.redis.set(cacheKey,JSON.stringify(result),'EX',15); } catch {}
    return result;
  }
  async invalidateServices() { try { await this.redis.incr('services:version'); } catch {} }
  async onModuleDestroy() { this.redis.disconnect(); await this.pool.end(); }
}
