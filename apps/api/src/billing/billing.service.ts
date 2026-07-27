import { Inject, Injectable } from '@nestjs/common';
import type {
  SubscriptionStore,
  WebhookEventStore,
} from './subscription-store.js';
import {
  STRIPE_GATEWAY,
  SUBSCRIPTION_STORE,
  WEBHOOK_EVENT_STORE,
  type StripeGateway,
  type SubscriptionRecord,
} from './types.js';

function newId(): string {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type CheckoutInput = {
  orgId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
};

@Injectable()
export class BillingService {
  constructor(
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
    @Inject(SUBSCRIPTION_STORE) private readonly subscriptions: SubscriptionStore,
    @Inject(WEBHOOK_EVENT_STORE) private readonly events: WebhookEventStore,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<{ url: string; sessionId: string }> {
    const priceId =
      process.env.STRIPE_PRICE_SEASON_PASS ?? 'price_season_pass_test';
    const existing = await this.subscriptions.getByOrgId(input.orgId);

    const session = await this.stripe.createCheckoutSession({
      orgId: input.orgId,
      customerId: existing?.stripeCustomerId,
      customerEmail: input.customerEmail,
      priceId,
      mode: 'subscription',
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      seasonPass: true,
    });

    return { url: session.url, sessionId: session.sessionId };
  }

  async createPortal(input: {
    orgId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const existing = await this.subscriptions.getByOrgId(input.orgId);
    if (!existing?.stripeCustomerId) {
      throw new Error('no Stripe customer for org — checkout first');
    }
    const portal = await this.stripe.createPortalSession({
      customerId: existing.stripeCustomerId,
      returnUrl: input.returnUrl,
    });
    return { url: portal.url };
  }

  /**
   * Verify signature, claim event id (idempotent), apply subscription state.
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string | undefined,
  ): Promise<{ received: true; duplicate?: boolean; type?: string }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test';
    const event = this.stripe.constructEvent(payload, signature, secret);

    const claimed = await this.events.claim(event.id);
    if (!claimed) {
      return { received: true, duplicate: true, type: event.type };
    }

    await this.applyEvent(event.type, event.data.object);
    return { received: true, type: event.type };
  }

  async getSubscription(orgId: string): Promise<SubscriptionRecord | undefined> {
    return this.subscriptions.getByOrgId(orgId);
  }

  private async applyEvent(
    type: string,
    object: Record<string, unknown>,
  ): Promise<void> {
    if (type === 'checkout.session.completed') {
      const orgId =
        (object.metadata as { orgId?: string } | undefined)?.orgId ??
        (typeof object.client_reference_id === 'string'
          ? object.client_reference_id
          : undefined);
      const customerId =
        typeof object.customer === 'string' ? object.customer : undefined;
      const subscriptionId =
        typeof object.subscription === 'string'
          ? object.subscription
          : undefined;
      const seasonPass =
        (object.metadata as { seasonPass?: string } | undefined)?.seasonPass ===
        'true';

      if (!orgId || !customerId) return;

      const existing = await this.subscriptions.getByOrgId(orgId);
      await this.subscriptions.upsert({
        id: existing?.id ?? newId(),
        orgId,
        stripeCustomerId: customerId,
        stripeSubId: subscriptionId ?? existing?.stripeSubId,
        plan: seasonPass ? 'season_pass' : (existing?.plan ?? 'season_pass'),
        boatCount: existing?.boatCount ?? 1,
        status: 'active',
        seasonPass: seasonPass || existing?.seasonPass === true,
        currentPeriodEnd: existing?.currentPeriodEnd,
      });
      return;
    }

    if (
      type === 'customer.subscription.updated' ||
      type === 'customer.subscription.deleted'
    ) {
      const customerId =
        typeof object.customer === 'string' ? object.customer : undefined;
      if (!customerId) return;
      const existing = await this.subscriptions.getByCustomerId(customerId);
      if (!existing) return;

      const status =
        type === 'customer.subscription.deleted'
          ? 'canceled'
          : typeof object.status === 'string'
            ? object.status
            : existing.status;
      const periodEnd =
        typeof object.current_period_end === 'number'
          ? new Date(object.current_period_end * 1000).toISOString()
          : existing.currentPeriodEnd;

      await this.subscriptions.upsert({
        ...existing,
        stripeSubId:
          typeof object.id === 'string' ? object.id : existing.stripeSubId,
        status,
        currentPeriodEnd: periodEnd,
        seasonPass:
          status === 'active' || status === 'trialing'
            ? existing.seasonPass
            : false,
      });
    }
  }
}
