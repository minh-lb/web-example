import { Body, Controller, Delete, Get, Patch, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SignatureGuard, SignedRequest } from '../auth/signature.guard';
@Controller('api')
@UseGuards(SignatureGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('dashboard') dashboard(){return this.service.dashboard();}
}
