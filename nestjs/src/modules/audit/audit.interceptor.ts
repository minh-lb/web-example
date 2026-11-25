import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defer, lastValueFrom, Observable } from 'rxjs';
import { Database } from '../../database/database.service';
import { positive } from '../../common/validation';
import { SignedRequest } from '../auth/signature.guard';
import { AuditRepository, AuditEvent } from './audit.repository';

const AUDIT = 'business-audit';
export const Audit = (eventSource: string, eventName: string) => SetMetadata(AUDIT, {eventSource,eventName});

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private readonly reflector: Reflector, private readonly db: Database, private readonly repo: AuditRepository) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<Pick<AuditEvent,'eventSource'|'eventName'>>(AUDIT, context.getHandler());
    if (!metadata) return next.handle();
    const req = context.switchToHttp().getRequest<SignedRequest>();
    const res = context.switchToHttp().getResponse<{statusCode:number}>();
    const resourceId = positive(req.params.id) || null;
    return defer(async () => {
      try {
        return await this.db.auditTransaction(async () => {
          const result = await lastValueFrom(next.handle());
          await this.repo.append({...metadata, actor:req.actor, resourceId:resourceId || positive(result?.id) || null,
            outcome:'SUCCESS', statusCode:res.statusCode});
          return result;
        });
      } catch (error) {
        // Business transaction has rolled back. Preserve the original HTTP error.
        try {
          await this.repo.append({...metadata, actor:req.actor, resourceId, outcome:'FAILURE',
            statusCode:error instanceof HttpException ? error.getStatus() : 500});
        } catch {
          this.logger.error('Could not persist failed business audit event');
        }
        throw error;
      }
    });
  }
}
