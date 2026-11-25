import { Injectable } from '@nestjs/common';
import { Database } from '../../database/database.service';
@Injectable()
export class QueueProcessor {
  constructor(private readonly db: Database) {}
  async processNext():Promise<boolean>{ return (await this.processNextResult()) !== null; }
  async processNextResult():Promise<{jobId:number;success:boolean}|null>{
    const db = this.db;
  return db.transaction(async c=>{
    const [job]=await db.rows('SELECT * FROM background_jobs WHERE status="PENDING" AND (attempts=0 OR TIMESTAMPDIFF(SECOND,updated_at,CURRENT_TIMESTAMP)>=LEAST(attempts,2)) ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED',[],c);
    if(!job)return null;
    const attempt=Number(job.attempts)+1;
    await db.write('UPDATE background_jobs SET status="PROCESSING",attempts=?,last_error=NULL WHERE id=?',[attempt,job.id],c);
    let result:string|null=null,error:string|null=null;
    if(job.type==='DEMO'){if(attempt<=job.fail_until_attempt)error='Simulated queue failure';else result='Demo job completed';}
    else if(job.type==='BOOKING_CONFIRMATION'){
      const [booking]=await db.rows('SELECT b.reference,b.status,c.email FROM bookings b JOIN customers c ON c.id=b.customer_id WHERE b.id=?',[job.booking_id],c);
      if(!booking)error='Booking for confirmation not found';else result=booking.status==='CANCELED'?'Skipped: booking canceled':'Confirmation recorded for '+booking.reference+' ('+booking.email+')';
    }else error='Unknown job type: '+job.type;
    if(error)await db.write('UPDATE background_jobs SET status=?,last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[attempt>=job.max_attempts?'FAILED':'PENDING',error,job.id],c);
    else await db.write('UPDATE background_jobs SET status="COMPLETED",result=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=?',[result,job.id],c);
    return {jobId:Number(job.id),success:!error};
  });
  }
}
