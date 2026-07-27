import { createHmac } from 'node:crypto';
import type {
  CheckoutResult,
  PortalResult,
  StripeEventLike,
  StripeGateway,
} from './types.js';

/**
 * In-memory Stripe gateway for tests — no network.
 * Webhook "signatures" are HMAC of the raw body with the webhook secret.
 */
export class FakeStripeGateway implements StripeGateway {
  readonly sessions: Array<Record<string, unknown>> = [];
  private seq = 0;

  async createCheckoutSession(input: {
    orgId: string;
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    seasonPass: boolean;
    metadata?: Record<string, string>;
  }): Promise<CheckoutResult> {
    const sessionId = `cs_test_${++this.seq}`;
    const customerId = input.customerId ?? `cus_test_${this.seq}`;
    this.sessions.push({
      id: sessionId,
      mode: input.mode,
      customer: customerId,
      metadata: {
        orgId: input.orgId,
        seasonPass: input.seasonPass ? 'true' : 'false',
        ...input.metadata,
      },
      subscription:
        input.mode === 'subscription' ? `sub_test_${this.seq}` : undefined,
      status: 'open',
      url: `https://checkout.stripe.test/pay/${sessionId}`,
    });
    return {
      sessionId,
      url: `https://checkout.stripe.test/pay/${sessionId}`,
    };
  }

  async createPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<PortalResult> {
    return {
      url: `https://billing.stripe.test/session/${input.customerId}?return=${encodeURIComponent(input.returnUrl)}`,
    };
  }

  constructEvent(
    payload: string | Buffer,
    signature: string | undefined,
    secret: string,
  ): StripeEventLike {
    const raw = typeof payload === 'string' ? payload : payload.toString('utf8');
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    if (signature !== expected) {
      throw new Error('webhook signature verification failed');
    }
    return JSON.parse(raw) as StripeEventLike;
  }

  /** Helper for tests to mint a signed webhook body. */
  static sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}
