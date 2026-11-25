import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from './database/database.service';
import { reset } from './database/schema';
import { signature } from './modules/auth/signature.guard';
import { today } from './common/validation';
import { QueueProcessor } from './modules/queue/queue.processor';
const origin=process.env.TEST_API_URL||'http://127.0.0.1:8000';
const secret=process.env.INTERNAL_API_SECRET||'';
async function req(method:string,path:string,body?:unknown,role='admin'){
  const text=body===undefined?'':JSON.stringify(body),ts=String(Math.floor(Date.now()/1000)),email=role+'@bookly.local';
  return fetch(origin+path,{method,headers:{'Content-Type':'application/json','X-Frontend-Timestamp':ts,'X-Frontend-Identity':email,'X-Frontend-Role':role,'X-Frontend-Signature':signature(secret,ts,method,path,text,email,role)},...(body===undefined?{}:{body:text})});
}
test('signed API, authorization, persistence, duplicate conflict and worker retry',async()=>{
  const db=new Database();
  const processor = new QueueProcessor(db);
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
    assert.equal(await processor.processNext(),true);assert.equal((await db.rows('SELECT status FROM background_jobs'))[0].status,'COMPLETED');
    const demo=await req('POST','/api/queue',{scenario:'fail'});assert.equal(demo.status,201);const job=await demo.json() as any;
    for(let i=0;i<3;i++){await db.write('UPDATE background_jobs SET updated_at=DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 SECOND) WHERE id=?',[job.id]);assert.equal(await processor.processNext(),true);}
    assert.equal((await db.rows('SELECT status FROM background_jobs WHERE id=?',[job.id]))[0].status,'FAILED');
    assert.equal((await req('PATCH','/api/queue/'+job.id,{action:'retry'})).status,200);await processor.processNext();
    assert.equal((await db.rows('SELECT status FROM background_jobs WHERE id=?',[job.id]))[0].status,'COMPLETED');
  }finally{await db.onModuleDestroy();}
});

test('service, booking, customer and queue detail contracts with role boundaries', async () => {
  const db = new Database();
  try {
    await reset(db);
    const payload = {name:'Integration service',description:'Created for backend integration',category:'Consultation',durationMinutes:60,price:100000,color:'indigo',active:true};
    assert.equal((await req('POST','/api/services',payload,'staff')).status,403);
    const created=await req('POST','/api/services',payload);
    assert.equal(created.status,201);
    const service=await created.json() as any;
    assert.equal((await req('GET','/api/services/'+service.id,undefined,'staff')).status,200);
    assert.equal((await req('GET','/api/services/invalid')).status,400);
    assert.equal((await req('PATCH','/api/services/'+service.id,{price:200000})).status,200);
    const bookingResponse=await req('POST','/api/bookings',{serviceId:service.id,date:today(40),timeSlot:'17:00',customerName:'Integration Customer',customerEmail:'integration@example.com',customerPhone:'0901234567'},'staff');
    assert.equal(bookingResponse.status,201);
    const booking=await bookingResponse.json() as any;
    const bookingDetail=await req('GET','/api/bookings/'+booking.id,undefined,'staff');
    assert.equal(bookingDetail.status,200);
    assert.equal((await bookingDetail.json() as any).id,booking.id);
    const availability=await req('GET','/api/availability?serviceId='+service.id+'&date='+today(40));
    assert.equal(availability.status,200);
    assert.deepEqual((await availability.json() as any).booked,['17:00']);
    assert.equal((await req('GET','/api/customers',undefined,'staff')).status,403);
    assert.equal((await req('PATCH','/api/customers/'+booking.customerId,{name:'Not allowed'},'staff')).status,403);
    const customers=await req('GET','/api/customers?search=integration%40example.com');
    assert.equal(customers.status,200);
    assert.equal((await customers.json() as any).total,1);
    const customer=await req('GET','/api/customers/'+booking.customerId);
    assert.equal(customer.status,200);
    assert.equal((await customer.json() as any)._count.bookings,1);
    assert.equal((await req('PATCH','/api/customers/'+booking.customerId,{email:'sophia@example.com'})).status,409);
    assert.equal((await req('PATCH','/api/customers/'+booking.customerId,{email:'bad'})).status,400);
    const updated=await req('PATCH','/api/customers/'+booking.customerId,{name:'Updated Customer'});
    assert.equal(updated.status,200);
    assert.equal((await updated.json() as any).name,'Updated Customer');
    assert.equal((await req('GET','/api/customers/999999999')).status,404);
    const queue=await req('GET','/api/queue');
    assert.equal(queue.status,200);
    const job=(await queue.json() as any).items[0];
    assert.equal((await req('GET','/api/queue/'+job.id,undefined,'staff')).status,403);
    const jobDetail=await req('GET','/api/queue/'+job.id);
    assert.equal(jobDetail.status,200);
    assert.equal((await jobDetail.json() as any).bookingId,booking.id);
    assert.equal((await req('PATCH','/api/bookings/'+booking.id,{status:'CANCELED'})).status,200);
    assert.equal((await req('PATCH','/api/bookings/'+booking.id,{status:'CONFIRMED'})).status,409);
    assert.equal((await req('DELETE','/api/services/'+service.id)).status,200);
    assert.equal((await req('GET','/api/services/'+service.id,undefined,'staff')).status,404);
    assert.equal((await req('GET','/api/services/'+service.id)).status,200);
    assert.equal((await req('GET','/api/dashboard')).status,200);
    assert.equal((await fetch(origin+'/api/health')).status,200);
  } finally { await db.onModuleDestroy(); }
});

test('audit events track business changes and failures without request payloads', async () => {
  const db = new Database();
  try {
    await reset(db);
    assert.equal((await fetch(origin+'/api/audit-logs')).status,401);
    assert.equal((await req('GET','/api/audit-logs',undefined,'staff')).status,403);
    const denied = await req('POST','/api/services',{password:'not-logged'},'staff');
    assert.equal(denied.status,403);
    const response = await req('POST','/api/queue',{scenario:'success'});
    assert.equal(response.status,201);
    const job = await response.json() as any;
    const failed = await req('PATCH','/api/queue/'+job.id,{action:'retry'});
    assert.equal(failed.status,409);
    const list = await req('GET','/api/audit-logs?eventSource=queue');
    assert.equal(list.status,200);
    const events = await list.json() as any;
    assert.equal(events.total,2);
    assert.equal(events.items[0].eventName,'RetryJob');
    assert.equal(events.items[0].outcome,'FAILURE');
    assert.equal(events.items[0].statusCode,409);
    assert.equal(events.items[1].resourceId,job.id);
    assert.equal(events.items[1].outcome,'SUCCESS');
    assert.equal(events.items[1].userIdentity.email,'admin@bookly.local');
    assert.equal((await req('GET','/api/audit-logs?outcome=INVALID')).status,400);
    const failures = await (await req('GET','/api/audit-logs?outcome=FAILURE')).json() as any;
    assert.equal(failures.total,2);
    assert.ok(!JSON.stringify(failures).includes('not-logged'));
    const processor = new QueueProcessor(db);
    assert.equal(await processor.processNext(),true);
    const system = await (await req('GET','/api/audit-logs?eventName=ProcessJob')).json() as any;
    assert.equal(system.items[0].userIdentity.role,'system');
    assert.equal(system.items[0].resourceId,job.id);
  } finally { await db.onModuleDestroy(); }
});
