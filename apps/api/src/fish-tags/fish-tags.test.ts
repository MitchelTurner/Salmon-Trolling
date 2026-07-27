import { describe, expect, it } from 'vitest';
import { FishTagCodeSchema } from '@troll/shared';
import { MemoryCatchLookup, MemoryFishTagStore } from './memory-store.js';
import { FishTagsService } from './fish-tags.service.js';

describe('FishTagsService', () => {
  function setup() {
    const tags = new MemoryFishTagStore();
    const catches = new MemoryCatchLookup();
    const service = new FishTagsService(tags, catches);
    catches.seed({
      id: 'catch_1',
      orgId: 'org_1',
      species: 'king',
      boatName: 'Northern Light',
    });
    return { service, tags, catches };
  }

  it('issues a printable code and public status', async () => {
    const { service } = setup();
    const tag = await service.issue('org_1', {
      catchId: 'catch_1',
      guestName: 'Alex',
      guestEmail: 'alex@example.com',
    });

    expect(FishTagCodeSchema.safeParse(tag.code).success).toBe(true);
    expect(tag.statusPath).toBe(`/tag/${tag.code}`);
    expect(tag.stage).toBe('tagged');

    const status = await service.status(tag.code);
    expect(status?.species).toBe('king');
    expect(status?.boatName).toBe('Northern Light');
    expect(status?.stage).toBe('tagged');
  });

  it('is idempotent per catch', async () => {
    const { service } = setup();
    const a = await service.issue('org_1', { catchId: 'catch_1' });
    const b = await service.issue('org_1', { catchId: 'catch_1' });
    expect(b.code).toBe(a.code);
    expect(b.id).toBe(a.id);
  });
});
