import { describe, expect, it } from 'vitest';
import {
  SYNC_BATCH_MAX,
  SyncRequestSchema,
  SyncResponseSchema,
  dequeueableOpIds,
} from './sync.js';

describe('sync schemas', () => {
  it('accepts a valid sync request under the batch cap', () => {
    const parsed = SyncRequestSchema.parse({
      ops: [
        {
          id: '01HSYNC0000000000000000001',
          entity: 'Trip',
          opType: 'create',
          payload: { id: 'trip1' },
          clientTime: '2026-07-27T00:00:00.000Z',
        },
      ],
    });
    expect(parsed.ops).toHaveLength(1);
    expect(SYNC_BATCH_MAX).toBe(50);
  });

  it('rejects oversized batches', () => {
    const ops = Array.from({ length: SYNC_BATCH_MAX + 1 }, (_, i) => ({
      id: `op${i}`,
      entity: 'Spot',
      opType: 'create' as const,
      payload: { id: `s${i}` },
      clientTime: '2026-07-27T00:00:00.000Z',
    }));
    expect(() => SyncRequestSchema.parse({ ops })).toThrow();
  });

  it('marks accepted and duplicate as dequeueable', () => {
    expect(
      dequeueableOpIds([
        { id: 'a', status: 'accepted' },
        { id: 'b', status: 'duplicate' },
        { id: 'c', status: 'rejected', detail: 'nope' },
      ]),
    ).toEqual(['a', 'b']);
  });

  it('validates a sync response shape', () => {
    const parsed = SyncResponseSchema.parse({
      generatedAt: '2026-07-27T00:00:00.000Z',
      results: [{ id: 'a', status: 'accepted' }],
      serverOps: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(parsed.hasMore).toBe(false);
  });
});
