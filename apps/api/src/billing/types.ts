/** Local subscription row (mirrors Prisma Subscription). */
export type SubscriptionRecord = {
  id: string;
  orgId: string;
  stripeCustomerId: string;
  stripeSubId?: string;
  plan: string;
  boatCount: number;
  status: string;
  seasonPass: boolean;
  currentPeriodEnd?: string;
};

export type CheckoutResult = {
  readonly sessionId: string;
  readonly url: string;
};

export type PortalResult = {
  readonly url: string;
};

export type StripeEventLike = {
  readonly id: string;
  readonly type: string;
  readonly data: { readonly object: Record<string, unknown> };
};

/**
 * Stripe boundary — services never call the Stripe SDK directly.
 */
export interface StripeGateway {
  createCheckoutSession(input: {
    orgId: string;
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    seasonPass: boolean;
  }): Promise<CheckoutResult>;

  createPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<PortalResult>;

  /**
   * Verify webhook signature and return the event.
   * Fake gateway accepts a JSON body and ignores sig in tests.
   */
  constructEvent(
    payload: string | Buffer,
    signature: string | undefined,
    secret: string,
  ): StripeEventLike;
}

export const STRIPE_GATEWAY = Symbol('STRIPE_GATEWAY');
export const SUBSCRIPTION_STORE = Symbol('SUBSCRIPTION_STORE');
export const WEBHOOK_EVENT_STORE = Symbol('WEBHOOK_EVENT_STORE');

/** Season pass amount in integer cents (docs/10-backend.mdc). */
export const SEASON_PASS_AMOUNT_CENTS = 12_000;
