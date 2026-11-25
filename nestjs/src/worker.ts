import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { setTimeout as sleep } from 'node:timers/promises';
import { WorkerModule } from './worker.module';
import { QueueProcessor } from './modules/queue/queue.processor';
async function main() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const processor = app.get(QueueProcessor);
  let running = true;
  process.once('SIGTERM', () => { running = false; });
  process.once('SIGINT', () => { running = false; });
  try { while (running) { try { if (!await processor.processNext()) await sleep(250); } catch (error) { console.error(error); await sleep(1000); } } }
  finally { await app.close(); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exit(1); });
