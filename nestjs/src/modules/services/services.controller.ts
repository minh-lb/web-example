import { Body, Controller, Delete, Get, Patch, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { SignatureGuard, SignedRequest } from '../auth/signature.guard';
@Controller('api')
@UseGuards(SignatureGuard)
export class ServicesController {
  constructor(private readonly service: ServicesService) {}
  @Get('services') services(@Query() q:any,@Req() r:SignedRequest){return this.service.services(q,r.actor);}
  @Get('services/:id') detail(@Param('id') id:string,@Req() r:SignedRequest){return this.service.detail(id,r.actor);}
  @Post('services') createService(@Body() b:any,@Req() r:SignedRequest){return this.service.createService(b||{},r.actor);}
  @Patch('services/:id') updateService(@Param('id') id:string,@Body() b:any,@Req() r:SignedRequest){return this.service.updateService(id,b||{},r.actor);}
  @Delete('services/:id') archiveService(@Param('id') id:string,@Req() r:SignedRequest){return this.service.archiveService(id,r.actor);}
}
