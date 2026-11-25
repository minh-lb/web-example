import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Database, Sql } from '../../database/database.service';
import { iso } from '../../common/date-format';
import { Input, page, string, validDate } from '../../common/validation';
import { fail } from '../../common/http-error';
import { Actor } from '../auth/actor';

export type AuditEvent = {
  eventSource: string; eventName: string; resourceId: number | null;
  actor: Actor | null; outcome: 'SUCCESS' | 'FAILURE'; statusCode: number | null;
};

// Explicit allowlist: never serialize request bodies, headers, tokens or error messages.
export async function appendAudit(db: Database, event: AuditEvent, connection?: Sql) {
  await db.write(
    'INSERT INTO audit_events (event_id,event_source,event_name,resource_id,actor_email,actor_role,outcome,status_code) VALUES (?,?,?,?,?,?,?,?)',
    [randomUUID(), event.eventSource, event.eventName, event.resourceId, event.actor?.email ?? null,
      event.actor?.role ?? 'system', event.outcome, event.statusCode], connection);
}

@Injectable()
export class AuditRepository {
  constructor(private readonly db: Database) {}
  append(event: AuditEvent) { return appendAudit(this.db, event); }
  async list(q: Input) {
    const conditions: string[] = [], args: (string | number)[] = [];
    for (const [key, column] of [['eventSource','event_source'],['eventName','event_name'],['actor','actor_email'],['outcome','outcome']] as const) {
      const value = string(q[key]).trim();
      if (value.length > 255) fail(400, 'Invalid audit filter');
      if (key === 'outcome' && value && !['SUCCESS','FAILURE'].includes(value)) fail(400, 'Invalid outcome');
      if (value) { conditions.push(column + '=?'); args.push(value); }
    }
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
