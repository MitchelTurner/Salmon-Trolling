import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dequeueableOpIds, type SyncResponse } from '@troll/shared';
import { getLocalDb, setLocalDb, TrollDatabase } from '../db/database.js';
import { listPendingSyncOps, writeLocal } from '../db/write.js';
import { ulid } from '../db/ulid.js';
import { flushSyncQueue, type SyncTransport } from './client.js';

describe('flushSyncQueue', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`sync-test-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    const db = getLocalDb();
    db.close();
    await db.delete();
  });

  it('dequeues only accepted and duplicate ops (partial success)', async () => {
    const orgId = 'org1';
    await writeLocal(
      'spots',
      {
        id: 's1',
        orgId,
        name: 'ok',
        geom: { type: 'Point', coordinates: [-131, 55] },
        isPrivate: true,
        updatedAt: new Date().toISOString(),
      },
      { orgId },
    );
    await writeLocal(
      'spots',
      {
        id: 's2',
        orgId,
        name: 'bad',
        geom: { type: 'Point', coordinates: [-131, 55] },
        isPrivate: true,
        updatedAt: new Date().toISOString(),
      },
      { orgId },
    );

    const pending = await listPendingSyncOps(orgId);
    expect(pending).toHaveLength(2);

    const transport: SyncTransport = {
      async postSync({ ops }) {
        const results = ops.map((op, i) =>
          i === 0
            ? { id: op.id, status: 'accepted' as const }
            : {
                id: op.id,
                status: 'rejected' as const,
                detail: 'validation failed',
              },
        );
        const response: SyncResponse = {
          generatedAt: new Date().toISOString(),
          results,
          serverOps: [],
          nextCursor: null,
          hasMore: false,
        };
        expect(dequeueableOpIds(results)).toHaveLength(1);
        return response;
      },
    };

    const result = await flushSyncQueue({ orgId, transport, batchSize: 50 });
    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.incomplete).toBe(true);

    const left = await listPendingSyncOps(orgId);
    expect(left).toHaveLength(1);
    expect(left[0]?.payload.id).toBe('s2');
    expect(left[0]?.attempts).toBe(1);
  });

  it('resumes across batches under the size cap', async () => {
    const orgId = 'org1';
    for (let i = 0; i < 3; i += 1) {
      await writeLocal(
        'spots',
        {
          id: `s${i}`,
          orgId,
          name: `n${i}`,
          geom: { type: 'Point', coordinates: [-131, 55] },
          isPrivate: true,
          updatedAt: new Date().toISOString(),
        },
        { orgId },
      );
    }

    const batchSizes: number[] = [];
    const transport: SyncTransport = {
      async postSync({ ops }) {
        batchSizes.push(ops.length);
        return {
          generatedAt: new Date().toISOString(),
          results: ops.map((op) => ({ id: op.id, status: 'accepted' as const })),
          serverOps: [],
          nextCursor: null,
          hasMore: false,
        };
      },
    };

    const result = await flushSyncQueue({ orgId, transport, batchSize: 2 });
    expect(batchSizes).toEqual([2, 1]);
    expect(result.accepted).toBe(3);
    expect(await listPendingSyncOps(orgId)).toHaveLength(0);
  });

  it('applies pulled server ops without re-enqueueing', async () => {
    const orgId = 'org1';
    const transport: SyncTransport = {
      async postSync() {
        return {
          generatedAt: new Date().toISOString(),
          results: [],
          serverOps: [
            {
              id: 'srv1',
              entity: 'Boat',
              opType: 'create',
              payload: {
                id: 'boat-remote',
                orgId,
                name: 'From dock',
                hasPaddleWheel: false,
                hasN2K: false,
                hasProbe: false,
                updatedAt: '2026-07-27T00:00:00.000Z',
              },
              clientTime: '2026-07-27T00:00:00.000Z',
              appliedAt: '2026-07-27T00:00:01.000Z',
            },
          ],
          nextCursor: '2026-07-27T00:00:01.000Z|srv1',
          hasMore: false,
        };
      },
    };

    const result = await flushSyncQueue({ orgId, transport });
    expect(result.pulled).toBe(1);
    const boat = await getLocalDb().boats.get('boat-remote');
    expect(boat?.name).toBe('From dock');
    // Inbound apply must not create outbound sync ops.
    expect(await listPendingSyncOps(orgId)).toHaveLength(0);
  });

  it('treats duplicate as success for dequeue (retry-safe)', async () => {
    const orgId = 'org1';
    await writeLocal(
      'trips',
      { id: 't1', orgId, startedAt: new Date().toISOString() },
      { orgId },
    );
    const [op] = await listPendingSyncOps(orgId);
    expect(op).toBeTruthy();

    const transport: SyncTransport = {
      async postSync({ ops }) {
        return {
          generatedAt: new Date().toISOString(),
          results: ops.map((o) => ({ id: o.id, status: 'duplicate' as const })),
          serverOps: [],
          nextCursor: null,
          hasMore: false,
        };
      },
    };

    await flushSyncQueue({ orgId, transport });
    expect(await listPendingSyncOps(orgId)).toHaveLength(0);
  });
});
