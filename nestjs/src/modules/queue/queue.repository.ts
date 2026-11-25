import { Injectable } from '@nestjs/common';
import { Database, Sql } from '../../database/database.service';
import { fail } from '../../common/http-error';
import { JOB_STATUSES, demoFailures } from './queue.policy';
import { jobData, jobJoin } from './job.mapper';
@Injectable()
export class QueueRepository {
  constructor(private readonly db: Database) {}
  async job(id:number,c?:Sql) { const [r]=await this.db.rows('SELECT j.*,b.reference'+jobJoin+' WHERE j.id=?',[id],c); return r?jobData(r):fail(404,'Job not found'); }
  async queue(status:string,page:number) {
    const counts:Record<string,number>=Object.fromEntries(JOB_STATUSES.map(s=>[s,0]));
    for(const r of await this.db.rows('SELECT status,COUNT(*) AS total FROM background_jobs GROUP BY status')) counts[r.status]=Number(r.total);
    const where=status==='ALL'?'':' WHERE j.status=?', args=status==='ALL'?[]:[status];
    const total=await this.db.count('SELECT COUNT(*) AS total FROM background_jobs j'+where,args);
    const totalPages=Math.max(1,Math.ceil(total/100)); page=Math.min(page,totalPages);
    const items=(await this.db.rows('SELECT j.*,b.reference'+jobJoin+where+' ORDER BY j.created_at DESC,j.id DESC LIMIT 100 OFFSET ?',[...args,(page-1)*100])).map(jobData);
    return {items,counts,page,totalPages,total};
  }
  async enqueue(scenario:string) {
    const r=await this.db.write('INSERT INTO background_jobs (type,fail_until_attempt,created_at,updated_at) VALUES (?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',['DEMO',demoFailures(scenario)]); return this.job(r.insertId);
  }
  async retry(id:number) {
    return this.db.transaction(async c=>{
      const [r]=await this.db.rows('SELECT status FROM background_jobs WHERE id=? FOR UPDATE',[id],c);
      if(!r) fail(404,'Job not found');
      if(r.status!=='FAILED') fail(409,'Only failed jobs can be retried');
      await this.db.write('UPDATE background_jobs SET status="PENDING",attempts=0,fail_until_attempt=0,last_error=NULL,result=NULL,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?',[id],c);
      return this.job(id,c);
    });
  }
}
