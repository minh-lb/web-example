import { Injectable } from '@nestjs/common';
import { QueueRepository } from './queue.repository';
import { Input, id, page, string } from '../../common/validation';
import { fail } from '../../common/http-error';
import { Actor, admin } from '../auth/actor';
import { JOB_STATUSES } from './queue.policy';
@Injectable()
export class QueueService {
  constructor(private readonly repo: QueueRepository) {}
  queue(q:Input,a:Actor){admin(a);const status=(string(q.status)||'ALL').toUpperCase();if(![...JOB_STATUSES,'ALL'].includes(status))fail(400,'Invalid queue filters');return this.repo.queue(status,page(q.page));}
  enqueue(b:Input,a:Actor){admin(a);return this.repo.enqueue(string(b.scenario));}
  retry(raw:string,b:Input,a:Actor){admin(a);const jobId=id(raw,'Invalid job ID');if(b.action!=='retry')fail(400,'Invalid action');return this.repo.retry(jobId);}
}
