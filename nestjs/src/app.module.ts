import { Module } from '@nestjs/common';
import { Database } from './infrastructure/database';
import { Repository } from './infrastructure/repository';
import { BookingService } from './application/booking.service';
import { ApiController,HealthController } from './http/controller';
import { SignatureGuard } from './http/signature.guard';
@Module({controllers:[ApiController,HealthController],providers:[Database,Repository,BookingService,SignatureGuard]})
export class AppModule {}
