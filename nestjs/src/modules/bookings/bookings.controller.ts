import { Body, Controller, Delete, Get, Patch, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { SignatureGuard, SignedRequest } from '../auth/signature.guard';
@Controller('api')
@UseGuards(SignatureGuard)
export class BookingsController {
  constructor(private readonly service: BookingsService) {}
  @Get('bookings') bookings(@Query() q:any){return this.service.bookings(q);}
  @Post('bookings') createBooking(@Body() b:any,@Req() r:SignedRequest){return this.service.createBooking(b||{},r.actor);}
  @Patch('bookings/:id') changeBooking(@Param('id') id:string,@Body() b:any){return this.service.changeBooking(id,b||{});}
  @Get('availability') availability(@Query() q:any){return this.service.availability(q);}
}
