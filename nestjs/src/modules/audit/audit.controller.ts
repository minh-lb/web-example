import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Input } from '../../common/validation';
import { SignatureGuard, SignedRequest } from '../auth/signature.guard';
import { AuditService } from './audit.service';

@Controller('api/audit-logs')
@UseGuards(SignatureGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get() list(@Query() query: Input, @Req() request: SignedRequest) {
    return this.service.list(query, request.actor);
  }
}
