import { Logger } from '@nestjs/common';
import { AuditDatabase } from './audit.database';

const schema = 'CREATE TABLE IF NOT EXISTS audit_events (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_id CHAR(36) UNIQUE NOT NULL, event_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), event_source VARCHAR(64) NOT NULL, event_name VARCHAR(64) NOT NULL, resource_id BIGINT UNSIGNED NULL, actor_email VARCHAR(255) NULL, actor_role VARCHAR(16) NOT NULL, outcome VARCHAR(16) NOT NULL, status_code SMALLINT UNSIGNED NULL, INDEX(event_time,id), INDEX(event_source,event_time), INDEX(event_name,event_time), INDEX(actor_email,event_time), INDEX(outcome,event_time)) ENGINE=InnoDB';

export async function initializeAuditSchema(db: Pick<AuditDatabase,'write'>): Promise<void> {
  try {
    await db.write(schema);
  } catch {
    // Audit initialization must not prevent the business API from starting.
    new Logger('AuditSchema').error('Audit table initialization failed; check database permissions and restart the API');
  }
}
