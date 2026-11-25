import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QueueProcessor } from './modules/queue/queue.processor';
import { AuditStorageModule } from './modules/audit/audit-storage.module';
import { AuditedQueueRunner } from './modules/audit/audited-queue-runner';
@Module({ imports: [DatabaseModule, AuditStorageModule], providers: [QueueProcessor, AuditedQueueRunner] })
export class WorkerModule {}
