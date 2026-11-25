import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuditDatabase } from './audit.database';
import { initializeAuditSchema } from './audit.schema';
import { AuditEvent } from './audit.repository';
import { AuditWriter } from './audit.writer';
import { AuditedQueueRunner } from './audited-queue-runner';
import { QueueProcessor } from '../queue/queue.processor';

test('audit schema failure does not reject API initialization',async()=>{
  let attempted=false;
  await initializeAuditSchema({write:async(sql:string)=>{attempted=true;assert.match(sql,/CREATE TABLE IF NOT EXISTS audit_events/);throw Error('DDL unavailable');}} as Pick<AuditDatabase,'write'>);
  assert.equal(attempted,true);
});
test('worker exception is audited and original exception is preserved',async()=>{
  const error=Error('processor unavailable');
  const captured:AuditEvent[]=[];
  const runner=new AuditedQueueRunner({processNextResult:async()=>{throw error;}} as unknown as QueueProcessor,
    {record:(event:AuditEvent)=>captured.push(event)} as unknown as AuditWriter);
  await assert.rejects(runner.processNext(),e=>e===error);
  assert.deepEqual(captured,[{eventSource:'queue',eventName:'ProcessJob',resourceId:null,actor:null,outcome:'FAILURE',statusCode:null}]);
});
test('worker result survives audit enqueue exception and idle iterations do not log',async()=>{
  const writer={record:()=>{throw Error('audit unavailable');}} as unknown as AuditWriter;
  const runner=new AuditedQueueRunner({processNextResult:async()=>({jobId:5,success:true})} as unknown as QueueProcessor,writer);
  assert.equal(await runner.processNext(),true);
  let recorded=false;
  const idle=new AuditedQueueRunner({processNextResult:async()=>null} as unknown as QueueProcessor,
    {record:()=>{recorded=true;}} as unknown as AuditWriter);
  assert.equal(await idle.processNext(),false);
  assert.equal(recorded,false);
});
