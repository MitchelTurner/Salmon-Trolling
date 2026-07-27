import { describe, expect, it } from 'vitest';
import { FakeEmailGateway } from '../guest-reports/memory-store.js';
import {
  MemoryCatchLookup,
  MemoryFishTagStore,
} from '../fish-tags/memory-store.js';
import { FishTagsService } from '../fish-tags/fish-tags.service.js';
import { MemoryShippingStore } from './memory-store.js';
import { ShippingService } from './shipping.service.js';

describe('ShippingService', () => {
  async function setup() {
    const tagStore = new MemoryFishTagStore();
    const catches = new MemoryCatchLookup();
    catches.seed({
      id: 'catch_1',
      orgId: 'org_1',
      species: 'coho',
      boatName: 'Sea Bear',
    });
    const tags = new FishTagsService(tagStore, catches);
    const email = new FakeEmailGateway();
    const shipping = new ShippingService(
      new MemoryShippingStore(),
      email,
      tags,
    );
    const tag = await tags.issue('org_1', {
      catchId: 'catch_1',
      guestName: 'Alex',
      guestEmail: 'alex@example.com',
    });
    return { shipping, tags, email, tag };
  }

  it('records shipment, notifies guest, and advances tag stage', async () => {
    const { shipping, tags, email, tag } = await setup();
    const record = await shipping.create('org_1', {
      tagCode: tag.code,
      carrier: 'UPS',
      tracking: '1Z999',
    });

    expect(record.carrier).toBe('UPS');
    expect(record.notifiedAt).toBeTruthy();
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe('alex@example.com');
    expect(email.sent[0]?.text).toContain('1Z999');

    const status = await tags.status(tag.code);
    expect(status?.stage).toBe('shipped');
    expect(status?.tracking).toBe('1Z999');
  });
});
