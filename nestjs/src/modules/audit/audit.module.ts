import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({imports:[DatabaseModule, AuthModule], controllers:[AuditController],
  providers:[AuditRepository, AuditService, {provide:APP_INTERCEPTOR,useClass:AuditInterceptor}]})
export class AuditModule {}
