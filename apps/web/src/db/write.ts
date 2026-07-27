import { getLocalDb, type TrollDatabase } from './database.js';
import type {
  DomainTableName,
  SyncOpType,
  SyncQueueRecord,
} from './types.js';
import { ulid } from './ulid.js';

const ENTITY_BY_TABLE: Record<Exclude<DomainTableName, 'syncQueue'>, string> = {
  orgs: 'Org',
  users: 'User',
  memberships: 'Membership',
  boats: 'Boat',
  rigs: 'Rig',
  gearItems: 'GearItem',
  trips: 'Trip',
  trackPoints: 'TrackPoint',
  catches: 'Catch',
  photos: 'Photo',
  spots: 'Spot',
  probes: 'Probe',
  probeSamples: 'ProbeSample',
  calibrationFits: 'CalibrationFit',
  regulations: 'Regulation',
  harvestRecords: 'HarvestRecord',
  bundles: 'Bundle',
};

type RecordWithId = { id: string } & Record<string, unknown>;

export type WriteOptions = {
  orgId: string;
  opType?: SyncOpType;
  /** When false, persist locally without enqueueing (e.g. inbound sync apply). */
  enqueue?: boolean;
  clientTime?: string;
  db?: TrollDatabase;
};

/**
 * All local writes go through here: IndexedDB first, then syncQueue.
 * The UI never talks to the network for persistence.
 */
export async function writeLocal<T extends RecordWithId>(
  table: Exclude<DomainTableName, 'syncQueue'>,
  record: T,
  options: WriteOptions,
): Promise<T> {
  const db = options.db ?? getLocalDb();
  const enqueue = options.enqueue ?? true;
  const opType = options.opType ?? 'create';
  const clientTime = options.clientTime ?? new Date().toISOString();

  await db.transaction('rw', db.table(table), db.syncQueue, async () => {
    await db.table(table).put(record);
    if (enqueue) {
      const op: SyncQueueRecord = {
        id: ulid(),
        orgId: options.orgId,
        entity: ENTITY_BY_TABLE[table],
        opType,
        payload: { ...record },
        clientTime,
        attempts: 0,
      };
      await db.syncQueue.put(op);
    }
  });

  return record;
}

/** Remove accepted ops from the queue after a successful sync batch. */
export async function dequeueSyncOps(
  opIds: readonly string[],
  db: TrollDatabase = getLocalDb(),
): Promise<number> {
  if (opIds.length === 0) return 0;
  await db.syncQueue.bulkDelete([...opIds]);
  return opIds.length;
}

export async function listPendingSyncOps(
  orgId?: string,
  db: TrollDatabase = getLocalDb(),
): Promise<SyncQueueRecord[]> {
  if (orgId === undefined) {
    return db.syncQueue.orderBy('clientTime').toArray();
  }
  return db.syncQueue.where('orgId').equals(orgId).sortBy('clientTime');
}
