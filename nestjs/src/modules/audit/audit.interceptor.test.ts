import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { EMPTY, lastValueFrom, of, throwError, toArray } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditWriter } from './audit.writer';
import { AuditRepository, AuditEvent } from './audit.repository';
import { resolveAuditEvent } from './audit-policy';

function context(method='POST', path='/api/bookings', actor: any={email:'staff@example.com',role:'staff'}) {
  return {getType:()=> 'http',getHandler:()=>function newHandler(){},
    switchToHttp:()=>({getRequest:()=>({method,route:{path},actor,params:{}}),getResponse:()=>({statusCode:201})})} as unknown as ExecutionContext;
}
test('global policy recognizes existing and new authenticated mutation routes', () => {
  assert.deepEqual(resolveAuditEvent('POST','/api/bookings','createBooking'),{eventSource:'bookings',eventName:'CreateBooking'});
  assert.deepEqual(resolveAuditEvent('PUT','/api/invoices/:id','updateInvoice'),{eventSource:'invoices',eventName:'PUT_updateInvoice'});
  assert.equal(resolveAuditEvent('GET','/api/bookings','list'),null);
  assert.equal(resolveAuditEvent('POST','/api/audit-logs','write'),null);
  assert.equal(resolveAuditEvent('POST','/api/auth/login','login'),null);
  assert.equal(resolveAuditEvent('POST',undefined,'unknown'),null);
});
test('global interceptor preserves business results and errors even when the sink fails', async () => {
  const captured: AuditEvent[] = [];
  const repo = {append:async (event:AuditEvent)=>{captured.push(event);throw Error('audit unavailable');}} as unknown as AuditRepository;
  const writer = new AuditWriter(repo);
  const interceptor = new AuditInterceptor(writer);
  const result = {id:7,password:'not captured'};
  assert.equal(await lastValueFrom(interceptor.intercept(context(),{handle:()=>of(result)})),result);
  const error = new HttpException('Conflict',409);
  await assert.rejects(lastValueFrom(interceptor.intercept(context(),{handle:()=>throwError(()=>error)})),e=>e===error);
  await writer.flush();
  assert.equal(captured.length,2);
  assert.equal(captured[0].resourceId,7);
  assert.equal(captured[0].outcome,'SUCCESS');
  assert.equal(captured[1].statusCode,409);
  assert.equal(captured[1].outcome,'FAILURE');
  assert.ok(!JSON.stringify(captured).includes('password'));
  await lastValueFrom(interceptor.intercept(context('GET'),{handle:()=>of(result)}));
  await lastValueFrom(interceptor.intercept(context('POST','/api/bookings',null),{handle:()=>of(result)}));
  assert.equal(captured.length,2);
});

test('slow storage does not delay responses and streaming values are preserved', async () => {
  let release!: () => void;
  const blocked = new Promise<void>(resolve=>{release=resolve;});
  const events: AuditEvent[] = [];
  const repo = {append:async (event:AuditEvent)=>{events.push(event);await blocked;}} as unknown as AuditRepository;
  const writer = new AuditWriter(repo);
  const interceptor = new AuditInterceptor(writer);
  try {
    assert.deepEqual(await lastValueFrom(interceptor.intercept(context(),{handle:()=>of(1,2,3)}).pipe(toArray())),[1,2,3]);
    assert.deepEqual(await lastValueFrom(interceptor.intercept(context(),{handle:()=>EMPTY}).pipe(toArray())),[]);
    assert.equal(events.length,1);
    for(let i=0;i<600;i++) writer.record({eventSource:'queue',eventName:'ProcessJob',resourceId:i+1,actor:null,outcome:'SUCCESS',statusCode:null});
  } finally {release();}
  await writer.flush();
  assert.equal(events.length,501);
});

test('audit metadata inspection never invokes business getters or breaks response', async () => {
  const captured: AuditEvent[] = [];
  const writer = new AuditWriter({append:async (event:AuditEvent)=>{captured.push(event);}} as unknown as AuditRepository);
  const interceptor = new AuditInterceptor(writer);
  let invoked = false;
  const result = {get id(){invoked=true;throw new Error('getter');}};
  assert.equal(await lastValueFrom(interceptor.intercept(context(),{handle:()=>of(result)})),result);
  const proxy = new Proxy({}, {getOwnPropertyDescriptor(){throw new Error('proxy');}});
  assert.equal(await lastValueFrom(interceptor.intercept(context(),{handle:()=>of(proxy)})),proxy);
  await writer.flush();
  assert.equal(invoked,false);
  assert.equal(captured.length,2);
  assert.ok(captured.every(event=>event.resourceId===null && event.outcome==='SUCCESS'));
});
test('unexpected synchronous audit enqueue failure preserves result and original exception', async () => {
  const interceptor = new AuditInterceptor({record:()=>{throw new Error('queue failure');}} as unknown as AuditWriter);
  const result = {id:5};
  assert.equal(await lastValueFrom(interceptor.intercept(context(),{handle:()=>of(result)})),result);
  const error = new HttpException('Conflict',409);
  await assert.rejects(lastValueFrom(interceptor.intercept(context(),{handle:()=>throwError(()=>error)})),e=>e===error);
});
