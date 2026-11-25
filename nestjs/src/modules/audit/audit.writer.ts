import { Injectable, Logger } from '@nestjs/common';
import { AuditEvent, AuditRepository } from './audit.repository';

@Injectable()
export class AuditWriter {
  private readonly logger = new Logger(AuditWriter.name);
  constructor(private readonly repo: AuditRepository) {}
  async record(event: AuditEvent): Promise<void> {
    try { await this.repo.append(event); }
    catch { this.logger.error('Could not persist business audit event'); }
  }
}
