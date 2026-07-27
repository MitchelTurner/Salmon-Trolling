import type { FishTag, FishTagStatus } from '@troll/shared';

export const FISH_TAG_STORE = Symbol('FISH_TAG_STORE');
export const CATCH_LOOKUP = Symbol('CATCH_LOOKUP');

export type CatchLookupRow = {
  readonly id: string;
  readonly orgId: string;
  readonly species: string;
  readonly boatName?: string;
  readonly massKg?: number;
}

export interface CatchLookup {
  get(orgId: string, catchId: string): Promise<CatchLookupRow | null>;
}

export type StoredFishTag = FishTag & {
  readonly boatName?: string;
  readonly processor?: string;
  readonly carrier?: string;
  readonly tracking?: string;
  readonly massKg?: number;
  readonly stage: FishTagStatus['stage'];
};

export interface FishTagStore {
  put(tag: StoredFishTag): Promise<void>;
  getByCatchId(catchId: string): Promise<StoredFishTag | null>;
  getByCode(code: string): Promise<StoredFishTag | null>;
  update(tag: StoredFishTag): Promise<void>;
}
