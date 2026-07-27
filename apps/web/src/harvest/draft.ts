import { getLocalDb, type TrollDatabase } from '../db/database.js';
import type { CatchRecord } from '../db/types.js';
import type { HarvestDraft } from './types.js';

/**
 * One-tap draft from a kept catch. Returns an in-memory draft only —
 * does not write IndexedDB and does not enqueue sync.
 *
 * Domain safety: never auto-fill without an explicit user action (the tap).
 */
export async function draftHarvestFromCatch(
  catchId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<HarvestDraft> {
  const row = await db.catches.get(catchId);
  if (!row) throw new Error('catch not found');
  return draftFromCatchRecord(row);
}

export function draftFromCatchRecord(row: CatchRecord): HarvestDraft {
  if (!row.kept) {
    throw new Error('harvest drafts are only for kept fish');
  }
  return {
    catchId: row.id,
    species: row.species,
    t: row.t,
    fromCatch: true,
  };
}

/** Blank draft the angler fills manually — still requires confirm to persist. */
export function emptyHarvestDraft(partial?: Partial<HarvestDraft>): HarvestDraft {
  return {
    species: partial?.species?.trim() || '',
    t: partial?.t ?? new Date().toISOString(),
    catchId: partial?.catchId,
    areaCode: partial?.areaCode,
    fromCatch: false,
  };
}
