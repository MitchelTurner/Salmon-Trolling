import type { ShippingRecord } from '@troll/shared';

export const SHIPPING_STORE = Symbol('SHIPPING_STORE');

export interface ShippingStore {
  put(row: ShippingRecord): Promise<void>;
  getByTagCode(tagCode: string): Promise<ShippingRecord | null>;
  list(orgId: string): Promise<ShippingRecord[]>;
}
