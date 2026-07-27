import { describe, expect, it, beforeEach } from 'vitest';
import { SYNC_BATCH_MAX } from '@troll/shared';
import { SyncService } from './sync.service.js';
import { MemorySyncStore } from './sync.store.js';

describe('SyncService', () => {
  let store: MemorySyncStore;
  let service: SyncService;

  beforeEach(() => {
    store = new MemorySyncStore();
    service = new SyncService(store);
  });

  it('accepts ops and is idempotent by op id', async () => {
    const op = {
      id: 'op1',
      entity: 'Trip',
      opType: 'create' as const,
      payload: { id: 'trip1', orgId: 'orgA' },
      clientTime: '2026-07-27T00:00:00.000Z',
    };

    const first = await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      { ops: [op] },
    );
    expect(first.results).toEqual([{ id: 'op1', status: 'accepted' }]);

    const second = await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      { ops: [op] },
    );
    expect(second.results).toEqual([{ id: 'op1', status: 'duplicate' }]);
  });

  it('supports partial success in a batch', async () => {
    const res = await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      {
        ops: [
          {
            id: 'ok',
            entity: 'Spot',
            opType: 'create',
            payload: { id: 'spot1' },
            clientTime: '2026-07-27T00:00:00.000Z',
          },
          {
            id: 'bad',
            entity: 'Catch',
            opType: 'update',
            payload: { id: 'c1' },
            clientTime: '2026-07-27T00:00:01.000Z',
          },
        ],
      },
    );

    expect(res.results[0]?.status).toBe('accepted');
    expect(res.results[1]?.status).toBe('rejected');
    expect(res.results[1]?.detail).toMatch(/append-only/);
  });

  it('scopes pull to the authenticated org and resumes by cursor', async () => {
    await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      {
        ops: [
          {
            id: 'a1',
            entity: 'Boat',
            opType: 'create',
            payload: { id: 'b1' },
            clientTime: '2026-07-27T00:00:00.000Z',
          },
          {
            id: 'a2',
            entity: 'Boat',
            opType: 'create',
            payload: { id: 'b2' },
            clientTime: '2026-07-27T00:00:01.000Z',
          },
        ],
        pullLimit: 1,
      },
    );

    const page1 = await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      { ops: [], pullLimit: 1 },
    );
    expect(page1.serverOps).toHaveLength(1);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      { ops: [], cursor: page1.nextCursor ?? undefined, pullLimit: 1 },
    );
    expect(page2.serverOps).toHaveLength(1);
    expect(page2.serverOps[0]?.id).not.toBe(page1.serverOps[0]?.id);

    const otherOrg = await service.sync(
      { orgId: 'orgB', userId: 'u2', role: 'OWNER' },
      { ops: [] },
    );
    expect(otherOrg.serverOps).toHaveLength(0);
  });

  it('never reads orgId from the op payload for scoping', async () => {
    await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      {
        ops: [
          {
            id: 'x',
            entity: 'Org',
            opType: 'create',
            payload: { id: 'spoof', orgId: 'orgEvil' },
            clientTime: '2026-07-27T00:00:00.000Z',
          },
        ],
      },
    );

    const evil = await service.sync(
      { orgId: 'orgEvil', userId: 'u9', role: 'CREW' },
      { ops: [] },
    );
    expect(evil.serverOps).toHaveLength(0);

    const mine = await service.sync(
      { orgId: 'orgA', userId: 'u1', role: 'OWNER' },
      { ops: [] },
    );
    expect(mine.serverOps).toHaveLength(1);
  });

  it('documents the batch size cap constant', () => {
    expect(SYNC_BATCH_MAX).toBe(50);
  });
});
