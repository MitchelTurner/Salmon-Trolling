import { DEFAULT_REGION_ID, type RegionId } from '@troll/shared';
import { getLocalDb, type TrollDatabase } from '../db/database.js';
import type { BundleRecord } from '../db/types.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import { ensurePersonalOrg } from '../trips/session.js';

/** Latest local dock bundle for a region (IndexedDB only). */
export async function getLocalBundle(
  regionId: RegionId = DEFAULT_REGION_ID,
  db: TrollDatabase = getLocalDb(),
): Promise<BundleRecord | undefined> {
  const rows = await db.bundles.where('regionId').equals(regionId).toArray();
  if (rows.length === 0) return undefined;
  return rows.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
}

export async function saveLocalBundle(
  input: {
    regionId: RegionId;
    startIso: string;
    expiresAt: string;
    generatedAt: string;
    schemaVersion: number;
    signature: string;
    payload: Record<string, unknown>;
  },
  db: TrollDatabase = getLocalDb(),
): Promise<BundleRecord> {
  const orgId = await ensurePersonalOrg();
  const existing = await getLocalBundle(input.regionId, db);
  const record: BundleRecord = {
    id: existing?.id ?? ulid(),
    regionId: input.regionId,
    startIso: input.startIso,
    expiresAt: input.expiresAt,
    generatedAt: input.generatedAt,
    schemaVersion: input.schemaVersion,
    signature: input.signature,
    payload: input.payload,
  };

  // Inbound from server — persist locally, do not bounce onto syncQueue.
  await writeLocal('bundles', record, {
    orgId,
    opType: 'update',
    enqueue: false,
    db,
    clientTime: input.generatedAt,
  });
  return record;
}
