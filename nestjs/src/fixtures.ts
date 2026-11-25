import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Database } from './database/database.service';
import { assertTestDatabase,reset } from './database/schema';
async function main(){
  assertTestDatabase();const db=new Database();
  try{
    const [command,action,...args]=process.argv.slice(2);
    if(command==='reset')await reset(db);
    else if(command==='queue'&&action==='seed'){
      const marker='queue-pagination-'+randomUUID();
      await db.transaction(async c=>{for(let i=0;i<102;i++)await db.write('INSERT INTO background_jobs (type,status,attempts,fail_until_attempt,last_error,created_at,updated_at) VALUES ("DEMO","FAILED",3,3,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',[marker],c);});
      console.log(JSON.stringify((await db.rows('SELECT id FROM background_jobs WHERE last_error=? ORDER BY id',[marker])).map(r=>Number(r.id))));
    }else if(command==='queue'&&action==='cleanup'){
      const ids=args.join(',').replace(/^--ids=/,'').split(',').map(Number);
      if(!ids.length||ids.some(i=>!Number.isSafeInteger(i)||i<1))throw new Error('Missing or invalid fixture IDs');
      await db.write('DELETE FROM background_jobs WHERE id IN (?)',[ids]);
    }else throw new Error('Unknown fixture command');
  }finally{await db.onModuleDestroy();}
}
main().catch(e=>{console.error(e);process.exit(1);});
