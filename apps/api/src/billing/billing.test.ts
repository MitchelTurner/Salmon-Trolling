import { describe, expect, it } from 'vitest';
import { BillingService } from './billing.service.js';
import { FakeStripeGateway } from './fake-stripe.js';
import {
  MemorySubscriptionStore,
  MemoryWebhookEventStore,
} from './subscription-store.js';
import { SEASON_PASS_AMOUNT_CENTS } from './types.js';

describe('BillingService', () => {
  const secret = 'whsec_test';

  function setup() {
    const stripe = new FakeStripeGateway();
    const subscriptions = new MemorySubscriptionStore();
    const events = new MemoryWebhookEventStore();
    const billing = new BillingService(stripe, subscriptions, events);
    return { stripe, subscriptions, events, billing };
  }

  it('creates a season-pass checkout session URL', async () => {
    const { billing } = setup();
    const result = await billing.createCheckout({
      orgId: 'org_1',
      successUrl: 'https://troll.app/billing/success',
      cancelUrl: 'https://troll.app/billing/cancel',
      customerEmail: 'angler@example.com',
    });

    expect(result.sessionId).toMatch(/^cs_test_/);
    expect(result.url).toContain('checkout.stripe.test');
    expect(SEASON_PASS_AMOUNT_CENTS).toBe(12_000);
  });

  it('opens the customer portal after checkout completes', async () => {
    const { billing, stripe } = setup();
    process.env.STRIPE_WEBHOOK_SECRET = secret;

    await billing.createCheckout({
      orgId: 'org_1',
      successUrl: 'https://troll.app/ok',
      cancelUrl: 'https://troll.app/no',
    });

    const completed = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_test_1',
          subscription: 'sub_test_1',
          metadata: { orgId: 'org_1', seasonPass: 'true' },
          client_reference_id: 'org_1',
        },
      },
    };
    const body = JSON.stringify(completed);
    await billing.handleWebhook(body, FakeStripeGateway.sign(body, secret));

    const portal = await billing.createPortal({
      orgId: 'org_1',
      returnUrl: 'https://troll.app/account',
    });
    expect(portal.url).toContain('billing.stripe.test');
    expect(portal.url).toContain('cus_test_1');

    const sub = await billing.getSubscription('org_1');
    expect(sub?.seasonPass).toBe(true);
    expect(sub?.status).toBe('active');
    expect(stripe.sessions).toHaveLength(1);
  });

  it('is idempotent by Stripe event id', async () => {
    const { billing } = setup();
    process.env.STRIPE_WEBHOOK_SECRET = secret;

    const event = {
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_x',
          subscription: 'sub_x',
          metadata: { orgId: 'org_x', seasonPass: 'true' },
        },
      },
    };
    const body = JSON.stringify(event);
    const sig = FakeStripeGateway.sign(body, secret);

    const first = await billing.handleWebhook(body, sig);
    const second = await billing.handleWebhook(body, sig);

    expect(first.duplicate).toBeUndefined();
    expect(second.duplicate).toBe(true);

    const sub = await billing.getSubscription('org_x');
    expect(sub?.stripeCustomerId).toBe('cus_x');
  });

  it('rejects webhooks with bad signatures', async () => {
    const { billing } = setup();
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    await expect(
      billing.handleWebhook('{"id":"evt_bad"}', 'not-a-sig'),
    ).rejects.toThrow(/signature/i);
  });
});
