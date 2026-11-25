import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueRepository } from './queue.repository';
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [QueueController],
  providers: [QueueService, QueueRepository],
})
export class QueueModule {}
