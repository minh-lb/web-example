import { Injectable, Logger } from '@nestjs/common';
import { QueueProcessor } from '../queue/queue.processor';
import { AuditEvent } from './audit.repository';
import { AuditWriter } from './audit.writer';

@Injectable()
export class AuditedQueueRunner {
  private readonly logger = new Logger(AuditedQueueRunner.name);
  constructor(private readonly processor: QueueProcessor, private readonly writer: AuditWriter) {}
  private record(event: AuditEvent) {
    try { this.writer.record(event); }
    catch { this.logger.error('Could not enqueue worker audit event'); }
  }
  async processNext(): Promise<boolean> {
    let event: Awaited<ReturnType<QueueProcessor['processNextResult']>>;
    try { event = await this.processor.processNextResult(); }
    catch (error) {
      this.record({eventSource:'queue',eventName:'ProcessJob',resourceId:null,actor:null,outcome:'FAILURE',statusCode:null});
      throw error;
    }
    if (!event) return false;
    this.record({eventSource:'queue',eventName:'ProcessJob',resourceId:event.jobId,
      actor:null,outcome:event.success?'SUCCESS':'FAILURE',statusCode:null});
    return true;
  }
}
