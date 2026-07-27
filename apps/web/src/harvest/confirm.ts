import { getLocalDb, type TrollDatabase } from '../db/database.js';
import type { HarvestRecordRow } from '../db/types.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import { ensurePersonalOrg } from '../trips/session.js';
import type { HarvestDraft } from './types.js';
import { ensurePersonalUser } from './personal-user.js';

export type ConfirmHarvestInput = {
  draft: HarvestDraft;
  /** Angler-edited fields at confirm time. */
  species?: string;
  areaCode?: string;
  t?: string;
  orgId?: string;
  userId?: string;
  db?: TrollDatabase;
  /**
   * Wall-clock for confirmedAt. Injected in tests so confirm is explicit —
   * never set before the angler confirms.
   */
  now?: () => Date;
};

/**
 * Persist a harvest record. The only write path.
 * `confirmedAt` is set here and nowhere else — never auto-submitted.
 */
export async function confirmHarvestDraft(
  input: ConfirmHarvestInput,
): Promise<HarvestRecordRow> {
  const db = input.db ?? getLocalDb();
  const species = (input.species ?? input.draft.species).trim().toLowerCase();
  if (!species) throw new Error('species is required');

  const orgId = input.orgId ?? (await ensurePersonalOrg());
  const userId = input.userId ?? (await ensurePersonalUser());
  const catchId = input.draft.catchId;

  if (catchId) {
    const existing = await db.harvestRecords
      .where('catchId')
      .equals(catchId)
      .first();
    if (existing) {
      throw new Error('a harvest record already exists for this catch');
    }
    const catchRow = await db.catches.get(catchId);
    if (!catchRow) throw new Error('catch not found');
    if (!catchRow.kept) throw new Error('catch is not kept');
  }

  const now = input.now ?? (() => new Date());
  const confirmedAt = now().toISOString();
  const record: HarvestRecordRow = {
    id: ulid(),
    userId,
    catchId,
    species,
    t: input.t ?? input.draft.t,
    areaCode: input.areaCode ?? input.draft.areaCode,
    confirmedAt,
  };

  await writeLocal('harvestRecords', record, {
    orgId,
    opType: 'create',
    db,
    clientTime: confirmedAt,
  });

  return record;
}

export async function listHarvestRecords(
  userId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<HarvestRecordRow[]> {
  return db.harvestRecords.where('userId').equals(userId).sortBy('t');
}
