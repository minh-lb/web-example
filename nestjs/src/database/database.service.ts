import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import Redis from 'ioredis';
import { AsyncLocalStorage } from 'node:async_hooks';

export type Row = RowDataPacket & Record<string, any>;
export type Sql = Pick<PoolConnection,'query'>;
@Injectable()
export class Database implements OnModuleDestroy {
  private readonly auditScope = new AsyncLocalStorage<{connection: PoolConnection; invalidateServices: boolean}>();
  readonly pool = createPool({host:process.env.DB_HOST || 'mysql',port:Number(process.env.DB_PORT || 3306),database:process.env.DB_DATABASE || 'web_example',user:process.env.DB_USERNAME || 'web_example',password:process.env.DB_PASSWORD || 'local-web-example-password',timezone:'Z',connectionLimit:10,supportBigNumbers:true});
  readonly redis = new Redis({host:process.env.REDIS_HOST || 'redis',port:Number(process.env.REDIS_PORT || 6379),maxRetriesPerRequest:1,enableOfflineQueue:false});
  constructor() { this.redis.on('error', error => console.error('Redis:',error.message)); }
  async rows(sql:string, params:any[] = [], conn:Sql = this.auditScope.getStore()?.connection ?? this.pool): Promise<Row[]> { const [rows] = await conn.query<Row[]>(sql,params); return rows; }
  async write(sql:string, params:any[] = [], conn:Sql = this.auditScope.getStore()?.connection ?? this.pool): Promise<ResultSetHeader> { const [result] = await conn.query<ResultSetHeader>(sql,params); return result; }
  async count(sql:string,args:any[]=[],c?:Sql):Promise<number> { return Number((await this.rows(sql,args,c))[0].total); }
  async transaction<T>(run:(conn:PoolConnection)=>Promise<T>):Promise<T> {
    const active = this.auditScope.getStore();
    if (active) return run(active.connection);
    const conn = await this.pool.getConnection();
    try { await conn.beginTransaction(); const result = await run(conn); await conn.commit(); return result; }
    catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  }
  async auditTransaction<T>(run:()=>Promise<T>):Promise<T> {
    let invalidate = false;
    const result = await this.transaction(async connection => {
      const scope = {connection, invalidateServices:false};
      const value = await this.auditScope.run(scope,run);
      invalidate = scope.invalidateServices;
      return value;
    });
    if (invalidate) await this.invalidateServices();
    return result;
  }
  async cached<T>(key:string, load:()=>Promise<T>):Promise<T> {
    let cacheKey:string;
    try { const version = await this.redis.get('services:version') || '0'; cacheKey = 'services:'+version+':'+key; const hit = await this.redis.get(cacheKey); if(hit) return JSON.parse(hit) as T; }
    catch { return load(); }
    const result = await load();
    try { await this.redis.set(cacheKey,JSON.stringify(result),'EX',15); } catch {}
    return result;
  }
  async invalidateServices() { const scope = this.auditScope.getStore(); if (scope) { scope.invalidateServices = true; return; } try { await this.redis.incr('services:version'); } catch {} }
  async onModuleDestroy() { this.redis.disconnect(); await this.pool.end(); }
}
