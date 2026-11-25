import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditRepository } from './audit.repository';
import { AuditWriter } from './audit.writer';

@Module({imports:[DatabaseModule],providers:[AuditRepository,AuditWriter],exports:[AuditRepository,AuditWriter]})
export class AuditStorageModule {}
