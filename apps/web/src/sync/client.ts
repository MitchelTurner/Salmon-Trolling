import {
  SYNC_BATCH_MAX,
  SyncResponseSchema,
  dequeueableOpIds,
  type SyncOp,
  type SyncResponse,
  type ServerSyncOp,
} from '@troll/shared';
import {
  dequeueSyncOps,
  listPendingSyncOps,
  writeLocal,
} from '../db/write.js';
import { getLocalDb, type TrollDatabase } from '../db/database.js';
import type { DomainTableName, SyncQueueRecord } from '../db/types.js';

export type SyncTransport = {
  postSync: (body: {
    cursor?: string;
    ops: SyncOp[];
    pullLimit?: number;
  }) => Promise<SyncResponse>;
};

export type SyncClientOptions = {
  orgId: string;
  transport: SyncTransport;
  db?: TrollDatabase;
  batchSize?: number;
  /** Cursor from the last successful pull (persist across launches). */
  cursor?: string | null;
  onServerOp?: (op: ServerSyncOp) => Promise<void>;
};

export type SyncFlushResult = {
  readonly sent: number;
  readonly accepted: number;
  readonly duplicate: number;
  readonly rejected: number;
  readonly pulled: number;
  readonly cursor: string | null;
  readonly hasMore: boolean;
  readonly incomplete: boolean;
};

const ENTITY_TO_TABLE: Record<string, Exclude<DomainTableName, 'syncQueue'>> = {
  Org: 'orgs',
  User: 'users',
  Membership: 'memberships',
  Boat: 'boats',
  Rig: 'rigs',
  GearItem: 'gearItems',
  Trip: 'trips',
  TrackPoint: 'trackPoints',
  Catch: 'catches',
  Spot: 'spots',
  Probe: 'probes',
  ProbeSample: 'probeSamples',
  CalibrationFit: 'calibrationFits',
  Regulation: 'regulations',
  HarvestRecord: 'harvestRecords',
  Bundle: 'bundles',
  Recommendation: 'recommendations',
  RecommendationFeedback: 'recommendationFeedback',
  EffortLog: 'effortLogs',
};

function toWireOp(row: SyncQueueRecord): SyncOp {
  return {
    id: row.id,
    entity: row.entity,
    opType: row.opType,
    payload: { ...row.payload },
    clientTime: row.clientTime,
  };
}

async function bumpAttempts(
  ids: readonly string[],
  db: TrollDatabase,
): Promise<void> {
  await db.transaction('rw', db.syncQueue, async () => {
    for (const id of ids) {
      const row = await db.syncQueue.get(id);
      if (!row) continue;
      await db.syncQueue.put({ ...row, attempts: row.attempts + 1 });
    }
  });
}

/**
 * Apply a server op into local IndexedDB without re-enqueueing.
 * Unknown entities are kept as no-ops so additive schema stays forward-compatible.
 */
export async function applyServerOp(
  op: ServerSyncOp,
  orgId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<void> {
  const table = ENTITY_TO_TABLE[op.entity];
  if (!table) return;
  if (typeof op.payload.id !== 'string') return;
  await writeLocal(table, op.payload as { id: string } & Record<string, unknown>, {
    orgId,
    enqueue: false,
    opType: op.opType,
    db,
    clientTime: op.clientTime,
  });
}

/**
 * Flush the local syncQueue in size-capped batches.
 * Partial success is normal: only accepted/duplicate ops are dequeued.
 * Resume mid-queue by calling again — rejected ops stay for retry/fix.
 */
export async function flushSyncQueue(
  options: SyncClientOptions,
): Promise<SyncFlushResult> {
  const db = options.db ?? getLocalDb();
  const batchSize = Math.min(
    options.batchSize ?? SYNC_BATCH_MAX,
    SYNC_BATCH_MAX,
  );
  const pending = await listPendingSyncOps(options.orgId, db);

  let cursor = options.cursor ?? null;
  let sent = 0;
  let accepted = 0;
  let duplicate = 0;
  let rejected = 0;
  let pulled = 0;
  let hasMore = false;
  let incomplete = false;

  let offset = 0;
  // Always pull at least once even with an empty outbound queue.
  do {
    const batch = pending.slice(offset, offset + batchSize);
    offset += batch.length;
    sent += batch.length;

    const response = await options.transport.postSync({
      cursor: cursor ?? undefined,
      ops: batch.map(toWireOp),
      pullLimit: batchSize,
    });
    const parsed = SyncResponseSchema.parse(response);

    for (const r of parsed.results) {
      if (r.status === 'accepted') accepted += 1;
      else if (r.status === 'duplicate') duplicate += 1;
      else rejected += 1;
    }

    const doneIds = dequeueableOpIds(parsed.results);
    await dequeueSyncOps(doneIds, db);

    const rejectedIds = parsed.results
      .filter((r) => r.status === 'rejected')
      .map((r) => r.id);
    await bumpAttempts(rejectedIds, db);

    for (const op of parsed.serverOps) {
      if (options.onServerOp) await options.onServerOp(op);
      else await applyServerOp(op, options.orgId, db);
      pulled += 1;
    }

    cursor = parsed.nextCursor;
    hasMore = parsed.hasMore;

    // Stop outbound loop when queue drained; keep pulling while server has more.
    if (batch.length === 0 && !hasMore) break;
    if (batch.length === 0 && hasMore) {
      // pull-only continuation
      continue;
    }
  } while (offset < pending.length || hasMore);

  // If anything remaining in queue after a full pass, mark incomplete.
  const remaining = await listPendingSyncOps(options.orgId, db);
  if (remaining.length > 0) incomplete = true;

  return {
    sent,
    accepted,
    duplicate,
    rejected,
    pulled,
    cursor,
    hasMore,
    incomplete,
  };
}

/** Fetch-based transport for the real API. */
export function createFetchSyncTransport(args: {
  baseUrl: string;
  getAuthorization: () => string | Promise<string>;
}): SyncTransport {
  return {
    async postSync(body) {
      const authorization = await args.getAuthorization();
      const res = await fetch(`${args.baseUrl.replace(/\/$/, '')}/sync`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/vnd.troll.v1+json',
          authorization,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`sync failed: HTTP ${res.status}`);
      }
      return SyncResponseSchema.parse(await res.json());
    },
  };
}
