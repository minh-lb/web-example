import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Database } from './database/database.service';
import { initialize } from './database/schema';
import { AuditDatabase } from './modules/audit/audit.database';
import { initializeAuditSchema } from './modules/audit/audit.schema';
export async function bootstrap(){
  const app=await NestFactory.create(AppModule,{rawBody:true});
  app.enableShutdownHooks();
  await initialize(app.get(Database));
  await initializeAuditSchema(app.get(AuditDatabase));
  await app.listen(Number(process.env.PORT||8000),'0.0.0.0');
  return app;
}
if(require.main===module) bootstrap().catch(e=>{console.error(e);process.exit(1);});
