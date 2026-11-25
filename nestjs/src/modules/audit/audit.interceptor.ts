import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { positive } from '../../common/validation';
import { SignedRequest } from '../auth/signature.guard';
import { AuditEvent } from './audit.repository';
import { AuditWriter } from './audit.writer';
import { resolveAuditEvent } from './audit-policy';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private readonly writer: AuditWriter) {}
  private record(event: AuditEvent) {
    try { this.writer.record(event); }
    catch { this.logger.error('Could not enqueue business audit event'); }
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<SignedRequest>();
    const metadata = resolveAuditEvent(req.method, req.route?.path, context.getHandler().name);
    if (!req.actor || !metadata) return next.handle();
    const res = context.switchToHttp().getResponse<{statusCode:number}>();
    const resourceId = positive(req.params?.id) || null;
    const actor = {...req.actor};
    let resultId: number | null = null;
    // Observe without replacing, delaying, or collapsing the business Observable.
    return next.handle().pipe(tap({
      next: (result:unknown) => {
        // Never execute getters or let a proxy/metadata failure affect business output.
        try {
          const descriptor = result && typeof result === 'object' ? Object.getOwnPropertyDescriptor(result,'id') : undefined;
          resultId = descriptor && 'value' in descriptor ? positive(descriptor.value) || null : null;
        } catch { resultId = null; }
      },
      error: (error:unknown) => {
        this.record({...metadata, actor, resourceId, outcome:'FAILURE',
          statusCode:error instanceof HttpException ? error.getStatus() : 500});
      },
      complete: () => {
        this.record({...metadata, actor, resourceId:resourceId || resultId,
          outcome:res.statusCode >= 400 ? 'FAILURE':'SUCCESS',statusCode:res.statusCode});
      },
    }));
  }
}
