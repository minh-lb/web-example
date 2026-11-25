import { Injectable } from '@nestjs/common';
import { QueueProcessor } from '../queue/queue.processor';
import { AuditWriter } from './audit.writer';

@Injectable()
export class AuditedQueueRunner {
  constructor(private readonly processor: QueueProcessor, private readonly writer: AuditWriter) {}
  async processNext(): Promise<boolean> {
    const event = await this.processor.processNextResult();
    if (!event) return false;
    this.writer.record({eventSource:'queue',eventName:'ProcessJob',resourceId:event.jobId,
      actor:null,outcome:event.success?'SUCCESS':'FAILURE',statusCode:null});
    return true;
  }
}
