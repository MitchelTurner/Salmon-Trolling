import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service.js';

/**
 * POST /webhooks/stripe
 * Signature-verified; idempotent by event id.
 */
@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post('stripe')
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const payload = req.rawBody ?? req.body;
    if (payload === undefined || payload === null) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/webhook-body',
        title: 'Missing body',
        detail: 'Webhook body required',
      });
    }

    try {
      const raw =
        typeof payload === 'string' || Buffer.isBuffer(payload)
          ? payload
          : JSON.stringify(payload);
      return await this.billing.handleWebhook(raw, signature);
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/webhook-signature',
        title: 'Webhook rejected',
        detail: err instanceof Error ? err.message : 'invalid webhook',
      });
    }
  }
}
