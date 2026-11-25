import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditDatabase } from './audit.database';
import { iso } from '../../common/date-format';
import { Input, page, string, validDate } from '../../common/validation';
import { fail } from '../../common/http-error';
import { Actor } from '../auth/actor';

export type AuditEvent = {
  eventSource: string; eventName: string; resourceId: number | null;
  actor: Actor | null; outcome: 'SUCCESS' | 'FAILURE'; statusCode: number | null; eventTime?: Date;
};

// Explicit allowlist: never serialize request bodies, headers, tokens or error messages.
export async function appendAudit(db: Pick<AuditDatabase,'write'>, event: AuditEvent) {
  await db.write(
    'INSERT INTO audit_events (event_id,event_source,event_name,resource_id,actor_email,actor_role,outcome,status_code,event_time) VALUES (?,?,?,?,?,?,?,?,?)',
    [randomUUID(), event.eventSource, event.eventName, event.resourceId, event.actor?.email ?? null,
      event.actor?.role ?? 'system', event.outcome, event.statusCode, event.eventTime ?? new Date()]);
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(AuditDatabase) private readonly db: Pick<AuditDatabase,'rows'|'write'|'count'>) {}
  append(event: AuditEvent) { return appendAudit(this.db, event); }
  async list(q: Input) {
    const conditions: string[] = [], args: (string | number)[] = [];
    for (const [key, column] of [['eventSource','event_source'],['eventName','event_name'],['actor','actor_email'],['outcome','outcome']] as const) {
      if (q[key] !== undefined && typeof q[key] !== 'string') fail(400, 'Invalid audit filter');
      const value = string(q[key]).trim();
      if (value.length > (key === 'actor' ? 255 : 64)) fail(400, 'Invalid audit filter');
      if (key === 'outcome' && value && !['SUCCESS','FAILURE'].includes(value)) fail(400, 'Invalid outcome');
      if (value) { conditions.push(column + '=?'); args.push(value); }
    }
    if ([q.from,q.to].some(value=>value !== undefined && typeof value !== 'string')) fail(400, 'Invalid date range');
    const from = string(q.from), to = string(q.to);
    if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) fail(400, 'Invalid date range');
    if (from) { conditions.push('event_time>=?'); args.push(from); }
    if (to) { conditions.push('event_time<DATE_ADD(?, INTERVAL 1 DAY)'); args.push(to); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const size = 25;
    const total = await this.db.count('SELECT COUNT(*) AS total FROM audit_events'+where,args);
    const totalPages = Math.max(1, Math.ceil(total/size)), current = Math.min(page(q.page),totalPages);
    const rows = await this.db.rows('SELECT * FROM audit_events'+where+' ORDER BY event_time DESC,id DESC LIMIT ? OFFSET ?',[...args,size,(current-1)*size]);
    return {items:rows.map(r => ({
      eventID:r.event_id, eventTime:iso(r.event_time), eventSource:r.event_source, eventName:r.event_name,
      resourceId:r.resource_id == null ? null : Number(r.resource_id),
      userIdentity:{email:r.actor_email,role:r.actor_role}, outcome:r.outcome, statusCode:r.status_code, readOnly:false,
    })), total, page:current, totalPages};
  }
}
