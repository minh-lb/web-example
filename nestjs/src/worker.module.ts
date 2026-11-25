import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QueueProcessor } from './modules/queue/queue.processor';
@Module({ imports: [DatabaseModule], providers: [QueueProcessor] })
export class WorkerModule {}
