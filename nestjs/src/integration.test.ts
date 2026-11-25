import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from './infrastructure/database';
import { reset } from './infrastructure/schema';
import { signature } from './http/signature.guard';
import { today } from './domain/policy';
import { processNext } from './worker';
const origin=process.env.TEST_API_URL||'http://127.0.0.1:8000';
const secret=process.env.INTERNAL_API_SECRET||'';
async function req(method:string,path:string,body?:unknown,role='admin'){
  const text=body===undefined?'':JSON.stringify(body),ts=String(Math.floor(Date.now()/1000)),email=role+'@bookly.local';
  return fetch(origin+path,{method,headers:{'Content-Type':'application/json','X-Frontend-Timestamp':ts,'X-Frontend-Identity':email,'X-Frontend-Role':role,'X-Frontend-Signature':signature(secret,ts,method,path,text,email,role)},...(body===undefined?{}:{body:text})});
}
test('signed API, authorization, persistence, duplicate conflict and worker retry',async()=>{
  const db=new Database();
  try{
    await reset(db);
    assert.equal((await fetch(origin+'/api/services')).status,401);
    assert.equal((await req('POST','/api/services',{},'staff')).status,403);
    assert.equal((await req('POST','/api/queue',{scenario:'success'},'staff')).status,403);
    const services=await req('GET','/api/services?search=Personal%20consultation');
    assert.equal(services.status,200);const {items}=await services.json() as any;assert.equal(items.length,1);
    const payload={serviceId:items[0].id,date:today(30),timeSlot:'17:00',customerName:'Test Customer',customerEmail:'booking@example.com',customerPhone:'0901234567'};
    const pair=await Promise.all([req('POST','/api/bookings',payload),req('POST','/api/bookings',payload)]);
    assert.deepEqual(pair.map(r=>r.status).sort(),[201,409]);
    const queue=await req('GET','/api/queue');const {items:jobs}=await queue.json() as any;assert.equal(jobs.length,1);
    assert.equal(await processNext(db),true);assert.equal((await db.rows('SELECT status FROM background_jobs'))[0].status,'COMPLETED');
    const demo=await req('POST','/api/queue',{scenario:'fail'});assert.equal(demo.status,201);const job=await demo.json() as any;
    for(let i=0;i<3;i++){await db.write('UPDATE background_jobs SET updated_at=DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 SECOND) WHERE id=?',[job.id]);assert.equal(await processNext(db),true);}
    assert.equal((await db.rows('SELECT status FROM background_jobs WHERE id=?',[job.id]))[0].status,'FAILED');
    assert.equal((await req('PATCH','/api/queue/'+job.id,{action:'retry'})).status,200);await processNext(db);
    assert.equal((await db.rows('SELECT status FROM background_jobs WHERE id=?',[job.id]))[0].status,'COMPLETED');
  }finally{await db.onModuleDestroy();}
});
