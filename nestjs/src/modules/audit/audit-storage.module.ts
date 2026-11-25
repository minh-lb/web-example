import { Module } from '@nestjs/common';
import { AuditDatabase } from './audit.database';
import { AuditRepository } from './audit.repository';
import { AuditWriter } from './audit.writer';

@Module({providers:[AuditDatabase,AuditRepository,AuditWriter],exports:[AuditRepository,AuditWriter]})
export class AuditStorageModule {}
