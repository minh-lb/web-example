import { Audit } from '../audit/audit.interceptor';
import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { SignatureGuard, SignedRequest } from '../auth/signature.guard';
import { CustomersService } from './customers.service';

@Controller('api/customers')
@UseGuards(SignatureGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}
  @Get() list(@Query() query: Record<string, unknown>, @Req() req: SignedRequest) {
    return this.service.list(query, req.actor);
  }
  @Get(':id') detail(@Param('id') id: string, @Req() req: SignedRequest) {
    return this.service.detail(id, req.actor);
  }
  @Audit('customers','UpdateCustomer')
  @Patch(':id') update(@Param('id') id: string, @Body() body: unknown, @Req() req: SignedRequest) {
    return this.service.update(id, body, req.actor);
  }
}
