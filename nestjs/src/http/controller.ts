import { Body,Controller,Delete,Get,Patch,Post,Param,Query,Req,UseGuards } from '@nestjs/common';
import { BookingService } from '../application/booking.service';
import { Database } from '../infrastructure/database';
import { SignatureGuard,SignedRequest } from './signature.guard';
import { fail } from '../domain/policy';

@Controller('api/health')
export class HealthController {
  constructor(private readonly db:Database){}
  @Get() async health(){try{await this.db.rows('SELECT COUNT(*) FROM services');return {status:'ok',database:process.env.DB_DATABASE?.endsWith('_test')?'test':'dev'};}catch{return fail(503,'Backend unavailable');}}
}
@Controller('api')
@UseGuards(SignatureGuard)
export class ApiController {
  constructor(private readonly service:BookingService){}
  @Get('services') services(@Query() q:any,@Req() r:SignedRequest){return this.service.services(q,r.actor);}
  @Post('services') createService(@Body() b:any,@Req() r:SignedRequest){return this.service.createService(b||{},r.actor);}
  @Patch('services/:id') updateService(@Param('id') id:string,@Body() b:any,@Req() r:SignedRequest){return this.service.updateService(id,b||{},r.actor);}
  @Delete('services/:id') archiveService(@Param('id') id:string,@Req() r:SignedRequest){return this.service.archiveService(id,r.actor);}
  @Get('bookings') bookings(@Query() q:any){return this.service.bookings(q);}
  @Post('bookings') createBooking(@Body() b:any,@Req() r:SignedRequest){return this.service.createBooking(b||{},r.actor);}
  @Patch('bookings/:id') changeBooking(@Param('id') id:string,@Body() b:any){return this.service.changeBooking(id,b||{});}
  @Get('availability') availability(@Query() q:any){return this.service.availability(q);}
  @Get('dashboard') dashboard(){return this.service.dashboard();}
  @Get('queue') queue(@Query() q:any,@Req() r:SignedRequest){return this.service.queue(q,r.actor);}
  @Post('queue') enqueue(@Body() b:any,@Req() r:SignedRequest){return this.service.enqueue(b||{},r.actor);}
  @Patch('queue/:id') retry(@Param('id') id:string,@Body() b:any,@Req() r:SignedRequest){return this.service.retry(id,b||{},r.actor);}
}
