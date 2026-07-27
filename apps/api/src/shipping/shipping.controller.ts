import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { RequirePermission } from '../auth/require-permission.js';
import { CreateShippingDto } from './shipping.dto.js';
import { ShippingService } from './shipping.service.js';

@Controller('org/shipping')
@UseGuards(OrgAuthGuard)
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get()
  @UseGuards(RequirePermission('trip:read'))
  async list(@Req() req: AuthedRequest) {
    const records = await this.shipping.list(req.orgContext!.orgId);
    return { generatedAt: new Date().toISOString(), records };
  }

  @Post()
  @UseGuards(RequirePermission('trip:write'))
  async create(@Req() req: AuthedRequest, @Body() body: CreateShippingDto) {
    try {
      const record = await this.shipping.create(req.orgContext!.orgId, body);
      return { generatedAt: record.shippedAt, record };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/shipping',
        title: 'Shipping failed',
        detail: err instanceof Error ? err.message : 'shipping failed',
      });
    }
  }
}
