import { Inject, Injectable } from '@nestjs/common';
import {
  mintFishTagCode,
  type FishTagStatus,
  type IssueFishTagBody,
} from '@troll/shared';
import { randomUUID } from 'node:crypto';
import {
  CATCH_LOOKUP,
  FISH_TAG_STORE,
  type CatchLookup,
  type FishTagStore,
  type StoredFishTag,
} from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

@Injectable()
export class FishTagsService {
  constructor(
    @Inject(FISH_TAG_STORE) private readonly tags: FishTagStore,
    @Inject(CATCH_LOOKUP) private readonly catches: CatchLookup,
  ) {}

  async issue(
    orgId: string,
    body: IssueFishTagBody,
  ): Promise<StoredFishTag> {
    const existing = await this.tags.getByCatchId(body.catchId);
    if (existing) return existing;

    const catchRow = await this.catches.get(orgId, body.catchId);
    if (!catchRow) throw new Error('catch not found');

    const code = mintFishTagCode(randomUUID());
    const createdAt = new Date().toISOString();
    const tag: StoredFishTag = {
      id: newId('tag'),
      orgId,
      catchId: body.catchId,
      code,
      guestName: body.guestName?.trim() || undefined,
      guestEmail: body.guestEmail?.toLowerCase() || undefined,
      species: catchRow.species,
      createdAt,
      statusPath: `/tag/${code}`,
      boatName: catchRow.boatName,
      stage: 'tagged',
    };
    await this.tags.put(tag);
    return tag;
  }

  async status(code: string): Promise<FishTagStatus | null> {
    const tag = await this.tags.getByCode(code);
    if (!tag) return null;
    return {
      code: tag.code,
      guestName: tag.guestName,
      species: tag.species,
      stage: tag.stage,
      boatName: tag.boatName,
      processor: tag.processor,
      carrier: tag.carrier,
      tracking: tag.tracking,
      updatedAt: tag.createdAt,
    };
  }
}
