import Stripe from 'stripe';
import { FakeStripeGateway } from './fake-stripe.js';
import type {
  CheckoutResult,
  PortalResult,
  StripeEventLike,
  StripeGateway,
} from './types.js';

export type LiveStripeGatewayOptions = {
  apiKey: string;
};

export class LiveStripeGateway implements StripeGateway {
  private readonly stripe: Stripe;

  constructor(options: LiveStripeGatewayOptions) {
    this.stripe = new Stripe(options.apiKey, {
      apiVersion: '2026-06-24.dahlia',
      typescript: true,
    });
  }

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
    const metadata = {
      orgId: input.orgId,
      seasonPass: input.seasonPass ? 'true' : 'false',
      ...input.metadata,
    };
    const session = await this.stripe.checkout.sessions.create({
      mode: input.mode,
      // Do not pass payment_method_types — enable dynamic payment methods.
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer: input.customerId,
      customer_email: input.customerId ? undefined : input.customerEmail,
      client_reference_id: input.orgId,
      metadata,
      subscription_data:
        input.mode === 'subscription'
          ? {
              metadata: {
                orgId: input.orgId,
                seasonPass: input.seasonPass ? 'true' : 'false',
              },
            }
          : undefined,
      integration_identifier: input.seasonPass
        ? `season-pass-${randomSuffix()}`
        : `checkout-${randomSuffix()}`,
    });

    if (!session.url) {
      throw new Error('Stripe Checkout Session missing url');
    }
    return { sessionId: session.id, url: session.url };
  }

  async createPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<PortalResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  constructEvent(
    payload: string | Buffer,
    signature: string | undefined,
    secret: string,
  ): StripeEventLike {
    if (!signature) throw new Error('missing stripe-signature header');
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      secret,
    );
    return {
      id: event.id,
      type: event.type,
      data: { object: event.data.object as unknown as Record<string, unknown> },
    };
  }
}

function randomSuffix(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

export function createStripeGatewayFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): StripeGateway {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) return new FakeStripeGateway();
  return new LiveStripeGateway({ apiKey: key });
}
