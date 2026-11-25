import 'reflect-metadata';
import { Database } from './infrastructure/database';
import { setTimeout as sleep } from 'node:timers/promises';

export async function processNext(db:Database):Promise<boolean>{
  return db.transaction(async c=>{
    const [job]=await db.rows('SELECT * FROM background_jobs WHERE status="PENDING" AND (attempts=0 OR TIMESTAMPDIFF(SECOND,updated_at,CURRENT_TIMESTAMP)>=LEAST(attempts,2)) ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED',[],c);
    if(!job)return false;
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
    return true;
  });
}
async function main(){
  const db=new Database();let running=true;
  process.on('SIGTERM',()=>{running=false;});process.on('SIGINT',()=>{running=false;});
  try{while(running){try{if(!await processNext(db))await sleep(250);}catch(e){console.error(e);await sleep(1000);}}}
  finally{await db.onModuleDestroy();}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exit(1);});
