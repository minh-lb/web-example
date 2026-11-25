import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import { AuditEvent, AuditRepository } from './audit.repository';

const MAX_PENDING = 500;

@Injectable()
export class AuditWriter implements BeforeApplicationShutdown {
  private readonly logger = new Logger(AuditWriter.name);
  private readonly pending: AuditEvent[] = [];
  private running: Promise<void> | null = null;
  private accepting = true;
  private dropped = 0;
  constructor(private readonly repo: AuditRepository) {}

  // Synchronous, bounded enqueue only; never await storage from the business path.
  record(event: AuditEvent): void {
    if (!this.accepting || this.pending.length >= MAX_PENDING) {
      this.reportDrop('queue full or shutting down');
      return;
    }
    this.pending.push({...event, eventTime:event.eventTime ?? new Date()});
    if (!this.running) this.start();
  }

  private start() {
    this.running = Promise.resolve().then(async () => {
      while (this.pending.length) {
        const event = this.pending.shift()!;
        try { await this.repo.append(event); }
        catch { this.reportDrop('storage unavailable'); }
      }
    }).finally(() => {
      this.running = null;
      if (this.pending.length) this.start();
    });
  }

  private reportDrop(reason:string) {
    this.dropped++;
    if (this.dropped === 1 || this.dropped % 100 === 0)
      this.logger.error('Business audit events dropped: '+this.dropped+' ('+reason+')');
  }

  async flush(): Promise<void> {
    while (this.running) await this.running;
  }

  async beforeApplicationShutdown() {
    this.accepting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([this.flush(),new Promise<void>(resolve=>{timer=setTimeout(resolve,3000);})]);
    } finally {
      if (timer) clearTimeout(timer);
      if (this.pending.length) {
        const count = this.pending.length;
        this.pending.length = 0;
        this.logger.error('Business audit events discarded at shutdown: '+count);
      }
    }
  }
}
