import { Body, Controller, Delete, Get, Patch, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { SignatureGuard, SignedRequest } from '../auth/signature.guard';
@Controller('api')
@UseGuards(SignatureGuard)
export class QueueController {
  constructor(private readonly service: QueueService) {}
  @Get('queue') queue(@Query() q:any,@Req() r:SignedRequest){return this.service.queue(q,r.actor);}
  @Post('queue') enqueue(@Body() b:any,@Req() r:SignedRequest){return this.service.enqueue(b||{},r.actor);}
  @Patch('queue/:id') retry(@Param('id') id:string,@Body() b:any,@Req() r:SignedRequest){return this.service.retry(id,b||{},r.actor);}
}
