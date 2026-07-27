import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { BillingService } from './billing.service.js';
import { CheckoutBodyDto, PortalBodyDto } from './billing.dto.js';

@Controller('billing')
@UseGuards(OrgAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /** POST /billing/checkout — season pass Checkout Session. */
  @Post('checkout')
  async checkout(@Req() req: AuthedRequest, @Body() body: CheckoutBodyDto) {
    const orgId = req.orgContext!.orgId;
    try {
      return await this.billing.createCheckout({
        orgId,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        customerEmail: body.customerEmail,
      });
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/billing-checkout',
        title: 'Checkout failed',
        detail: err instanceof Error ? err.message : 'checkout failed',
      });
    }
  }

  /** POST /billing/portal — Stripe Customer Portal. */
  @Post('portal')
  async portal(@Req() req: AuthedRequest, @Body() body: PortalBodyDto) {
    const orgId = req.orgContext!.orgId;
    try {
      return await this.billing.createPortal({
        orgId,
        returnUrl: body.returnUrl,
      });
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/billing-portal',
        title: 'Portal failed',
        detail: err instanceof Error ? err.message : 'portal failed',
      });
    }
  }
}
