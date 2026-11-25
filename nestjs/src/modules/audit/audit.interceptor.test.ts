import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
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
  const interceptor = new AuditInterceptor(new AuditWriter(repo));
  const result = {id:7,password:'not captured'};
  assert.equal(await lastValueFrom(interceptor.intercept(context(),{handle:()=>of(result)})),result);
  const error = new HttpException('Conflict',409);
  await assert.rejects(lastValueFrom(interceptor.intercept(context(),{handle:()=>throwError(()=>error)})),e=>e===error);
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
