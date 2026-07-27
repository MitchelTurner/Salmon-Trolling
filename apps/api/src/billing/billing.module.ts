import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { createStripeGatewayFromEnv } from './stripe-gateway.js';
import {
  MemorySubscriptionStore,
  MemoryWebhookEventStore,
} from './subscription-store.js';
import {
  STRIPE_GATEWAY,
  SUBSCRIPTION_STORE,
  WEBHOOK_EVENT_STORE,
} from './types.js';
import { StripeWebhookController } from './webhook.controller.js';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [
    BillingService,
    OrgAuthGuard,
    {
      provide: STRIPE_GATEWAY,
      useFactory: () => createStripeGatewayFromEnv(),
    },
    {
      provide: SUBSCRIPTION_STORE,
      useFactory: () => new MemorySubscriptionStore(),
    },
    {
      provide: WEBHOOK_EVENT_STORE,
      useFactory: () => new MemoryWebhookEventStore(),
    },
  ],
  exports: [BillingService, STRIPE_GATEWAY],
})
export class BillingModule {}
