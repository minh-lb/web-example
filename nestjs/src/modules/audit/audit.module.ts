import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditStorageModule } from './audit-storage.module';

@Module({imports:[AuthModule, AuditStorageModule], controllers:[AuditController],
  providers:[AuditService, {provide:APP_INTERCEPTOR,useClass:AuditInterceptor}]})
export class AuditModule {}
