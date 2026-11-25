import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { defer, lastValueFrom, Observable } from 'rxjs';
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
    return defer(async () => {
      let result: any;
      try {
        result = await lastValueFrom(next.handle());
      } catch (error) {
        await this.writer.record({...metadata, actor, resourceId, outcome:'FAILURE',
          statusCode:error instanceof HttpException ? error.getStatus() : 500});
        throw error;
      }
      await this.writer.record({...metadata, actor, resourceId:resourceId || positive(result?.id) || null,
        outcome:'SUCCESS', statusCode:res.statusCode});
      return result;
    });
  }
}
