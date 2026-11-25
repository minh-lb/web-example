import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuditService } from './audit.service';
import { AuditRepository, appendAudit } from './audit.repository';
import { Database } from '../../database/database.service';

test('only admins may list audit events', async () => {
  let called = false;
  const repo = {list:async () => {called=true;return {items:[]};}} as unknown as AuditRepository;
  const service = new AuditService(repo);
  assert.throws(() => service.list({}, {email:'staff@example.com',role:'staff'}));
  assert.equal(called,false);
  await service.list({}, {email:'admin@example.com',role:'admin'});
  assert.equal(called,true);
});
test('audit writer persists only explicitly selected metadata', async () => {
  let params: unknown[] = [];
  const db = {write:async (_sql:string, values:unknown[])=>{params=values;}} as unknown as Database;
  const event = {eventSource:'bookings',eventName:'CreateBooking',resourceId:7,actor:{email:'staff@example.com',role:'staff' as const},
    outcome:'SUCCESS' as const,statusCode:201,body:{password:'secret'}};
  await appendAudit(db,event);
  assert.deepEqual(params.slice(1,8),['bookings','CreateBooking',7,'staff@example.com','staff','SUCCESS',201]);
  assert.match(String(params[0]),/^[0-9a-f-]{36}$/);
});
