import { describe, expect, it } from 'vitest';
import { PublicLeaderboardSchema } from '@troll/shared';
import { DerbiesService } from './derbies.service.js';
import { MemoryDerbyStore } from './memory-store.js';

describe('DerbiesService leaderboard', () => {
  function setup() {
    const store = new MemoryDerbyStore();
    const service = new DerbiesService(store);
    store.seed({
      id: 'derby_1',
      orgId: 'org_1',
      slug: 'ketchikan-king-2026',
      name: 'Ketchikan King Derby 2026',
      startsAt: '2026-07-01T08:00:00.000Z',
      endsAt: '2026-07-05T02:00:00.000Z',
      rules: {
        eligibleSpecies: ['king'],
        minMassKg: 5,
        allowAppCatchEntries: false,
      },
    });
    return { store, service };
  }

  it('returns null for unknown slug', async () => {
    const { service } = setup();
    expect(await service.leaderboard('missing')).toBeNull();
  });

  it('ranks weigh-ins publicly without emails', async () => {
    const { store, service } = setup();
    await store.putEntry({
      id: 'entry_a',
      derbyId: 'derby_1',
      displayName: 'Alex River',
      email: 'alex@example.com',
      paidAt: '2026-06-01T12:00:00.000Z',
    });
    await store.putEntry({
      id: 'entry_b',
      derbyId: 'derby_1',
      displayName: 'Blake Harbor',
      email: 'blake@example.com',
      paidAt: '2026-06-02T12:00:00.000Z',
    });
    await store.putEntry({
      id: 'entry_unpaid',
      derbyId: 'derby_1',
      displayName: 'Casey',
      email: 'casey@example.com',
    });

    await store.putWeighIn({
      id: 'wi_small',
      derbyId: 'derby_1',
      entryId: 'entry_a',
      species: 'king',
      massKg: 12.5,
      t: '2026-07-02T16:00:00.000Z',
      station: 'thomas-basin',
      operatorId: 'op_1',
      witness: 'Dock judge',
      photoKeys: ['photo/a'],
    });
    await store.putWeighIn({
      id: 'wi_big',
      derbyId: 'derby_1',
      entryId: 'entry_b',
      species: 'king',
      massKg: 22.1,
      t: '2026-07-02T18:00:00.000Z',
      station: 'thomas-basin',
      operatorId: 'op_1',
      photoKeys: [],
    });
    await store.putWeighIn({
      id: 'wi_void',
      derbyId: 'derby_1',
      entryId: 'entry_a',
      species: 'king',
      massKg: 30,
      t: '2026-07-03T10:00:00.000Z',
      station: 'thomas-basin',
      operatorId: 'op_1',
      photoKeys: [],
      voidedAt: '2026-07-03T11:00:00.000Z',
      voidReason: 'scale recalibration',
    });

    const board = await service.leaderboard('ketchikan-king-2026');
    expect(board).not.toBeNull();
    const parsed = PublicLeaderboardSchema.parse(board);
    expect(parsed.entries.map((e) => e.weighInId)).toEqual([
      'wi_big',
      'wi_small',
    ]);
    expect(parsed.entries[0]!.rank).toBe(1);
    expect(parsed.entries[0]!.displayName).toBe('Blake Harbor');
    expect(parsed.entries[1]!.hasPhoto).toBe(true);
    expect(parsed.registeredCount).toBe(2);
    expect(parsed.weighInCount).toBe(2);
    expect(parsed.rules.allowAppCatchEntries).toBe(false);
    expect(JSON.stringify(parsed)).not.toContain('@example.com');
  });
});
