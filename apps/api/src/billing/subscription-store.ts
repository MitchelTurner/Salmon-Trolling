import type { SubscriptionRecord } from './types.js';

export interface SubscriptionStore {
  getByOrgId(orgId: string): Promise<SubscriptionRecord | undefined>;
  getByCustomerId(
    stripeCustomerId: string,
  ): Promise<SubscriptionRecord | undefined>;
  upsert(record: SubscriptionRecord): Promise<SubscriptionRecord>;
}

export class MemorySubscriptionStore implements SubscriptionStore {
  private readonly byOrg = new Map<string, SubscriptionRecord>();

  async getByOrgId(orgId: string): Promise<SubscriptionRecord | undefined> {
    return this.byOrg.get(orgId);
  }

  async getByCustomerId(
    stripeCustomerId: string,
  ): Promise<SubscriptionRecord | undefined> {
    return [...this.byOrg.values()].find(
      (r) => r.stripeCustomerId === stripeCustomerId,
    );
  }

  async upsert(record: SubscriptionRecord): Promise<SubscriptionRecord> {
    this.byOrg.set(record.orgId, record);
    return record;
  }
}

export interface WebhookEventStore {
  /** Returns true if this is the first time seeing the event id. */
  claim(eventId: string): Promise<boolean>;
}

export class MemoryWebhookEventStore implements WebhookEventStore {
  private readonly seen = new Set<string>();

  async claim(eventId: string): Promise<boolean> {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
}
