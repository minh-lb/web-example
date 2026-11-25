import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { positive } from '../../common/validation';
import { SignedRequest } from '../auth/signature.guard';
import { AuditWriter } from './audit.writer';
import { resolveAuditEvent } from './audit-policy';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly writer: AuditWriter) {}
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
        if (result && typeof result === 'object' && 'id' in result) resultId = positive(result.id) || null;
      },
      error: (error:unknown) => {
        this.writer.record({...metadata, actor, resourceId, outcome:'FAILURE',
          statusCode:error instanceof HttpException ? error.getStatus() : 500});
      },
      complete: () => {
        this.writer.record({...metadata, actor, resourceId:resourceId || resultId,
          outcome:res.statusCode >= 400 ? 'FAILURE':'SUCCESS',statusCode:res.statusCode});
      },
    }));
  }
}
