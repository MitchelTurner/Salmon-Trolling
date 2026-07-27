import { describe, expect, it } from 'vitest';
import {
  MemoryCatchLookup,
  MemoryFishTagStore,
} from '../fish-tags/memory-store.js';
import { FishTagsService } from '../fish-tags/fish-tags.service.js';
import { MemoryManifestStore } from './memory-store.js';
import { ProcessingService } from './processing.service.js';

describe('ProcessingService', () => {
  async function setup() {
    const tagStore = new MemoryFishTagStore();
    const catches = new MemoryCatchLookup();
    catches.seed({
      id: 'catch_1',
      orgId: 'org_1',
      species: 'king',
      boatName: 'Northern Light',
      massKg: 11.2,
    });
    const tags = new FishTagsService(tagStore, catches);
    const manifests = new MemoryManifestStore();
    const processing = new ProcessingService(manifests, tags);
    const tag = await tags.issue('org_1', {
      catchId: 'catch_1',
      guestName: 'Alex',
    });
    return { processing, tags, tag };
  }

  it('builds a printable manifest and advances tag stage', async () => {
    const { processing, tags, tag } = await setup();
    const manifest = await processing.create('org_1', {
      processor: 'Alaska General Seafoods',
      boatName: 'Northern Light',
      tagCodes: [tag.code],
    });

    expect(manifest.documentText).toContain('FISH PROCESSING MANIFEST');
    expect(manifest.documentText).toContain(tag.code);
    expect(manifest.lines[0]?.species).toBe('king');
    expect(manifest.lines[0]?.massKg).toBe(11.2);

    const status = await tags.status(tag.code);
    expect(status?.stage).toBe('at_processor');
    expect(status?.processor).toBe('Alaska General Seafoods');

    const listed = await processing.list('org_1');
    expect(listed).toHaveLength(1);
  });
});
