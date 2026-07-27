import type { ShippingRecord } from '@troll/shared';
import type { ShippingStore } from './types.js';

export class MemoryShippingStore implements ShippingStore {
  private readonly byTag = new Map<string, ShippingRecord>();

  async put(row: ShippingRecord): Promise<void> {
    this.byTag.set(row.tagCode, row);
  }

  async getByTagCode(tagCode: string): Promise<ShippingRecord | null> {
    return this.byTag.get(tagCode.toUpperCase()) ?? null;
  }

  async list(orgId: string): Promise<ShippingRecord[]> {
    return [...this.byTag.values()]
      .filter((r) => r.orgId === orgId)
      .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt));
  }
}
