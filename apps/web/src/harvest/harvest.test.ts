import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { logCatch } from '../catches/log-catch.js';
import { getLocalDb, setLocalDb, TrollDatabase } from '../db/database.js';
import { listPendingSyncOps } from '../db/write.js';
import { ulid } from '../db/ulid.js';
import {
  confirmHarvestDraft,
  draftFromCatchRecord,
  draftHarvestFromCatch,
  emptyHarvestDraft,
} from './index.js';

const geom = {
  type: 'Point' as const,
  coordinates: [-131.6, 55.3] as [number, number],
};

describe('harvest record', () => {
  beforeEach(async () => {
    localStorage.clear();
    const db = new TrollDatabase(`harvest-test-${ulid()}`);
    setLocalDb(db);
    await db.open();
    await db.trips.put({
      id: 'trip1',
      orgId: 'org1',
      startedAt: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    const db = getLocalDb();
    db.close();
    await db.delete();
    localStorage.clear();
  });

  it('one-tap draft stays in memory and does not persist or sync', async () => {
    const catchRow = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'coho',
      kept: true,
      geom,
      rigSnapshot: { delivery: 'DOWNRIGGER' },
      depthSnapshot: { depthM: 12, assumptions: [] },
    });

    const beforeOps = await listPendingSyncOps('org1');
    const draft = await draftHarvestFromCatch(catchRow.id);

    expect(draft.fromCatch).toBe(true);
    expect(draft.catchId).toBe(catchRow.id);
    expect(draft.species).toBe('coho');
    expect(await getLocalDb().harvestRecords.count()).toBe(0);

    const afterOps = await listPendingSyncOps('org1');
    expect(afterOps.filter((op) => op.entity === 'HarvestRecord')).toHaveLength(
      0,
    );
    expect(afterOps).toHaveLength(beforeOps.length);
  });

  it('rejects drafts for released fish', () => {
    expect(() =>
      draftFromCatchRecord({
        id: 'c1',
        tripId: 'trip1',
        t: new Date().toISOString(),
        geom,
        species: 'coho',
        kept: false,
        rigSnapshot: {},
        depthSnapshot: {},
        photoKeys: [],
        createdAt: new Date().toISOString(),
      }),
    ).toThrow(/kept fish/i);
  });

  it('persists only after explicit confirm and sets confirmedAt', async () => {
    const catchRow = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'chinook',
      kept: true,
      geom,
      rigSnapshot: { delivery: 'DIVER' },
      depthSnapshot: { depthM: 18, assumptions: [] },
    });

    const draft = draftFromCatchRecord(catchRow);
    const confirmedAt = '2026-07-27T12:00:00.000Z';
    const record = await confirmHarvestDraft({
      draft,
      species: 'Chinook',
      areaCode: '1C',
      orgId: 'org1',
      now: () => new Date(confirmedAt),
    });

    expect(record.confirmedAt).toBe(confirmedAt);
    expect(record.species).toBe('chinook');
    expect(record.catchId).toBe(catchRow.id);
    expect(record.areaCode).toBe('1C');

    const stored = await getLocalDb().harvestRecords.get(record.id);
    expect(stored?.confirmedAt).toBe(confirmedAt);

    const pending = await listPendingSyncOps('org1');
    expect(
      pending.some(
        (op) => op.entity === 'HarvestRecord' && op.opType === 'create',
      ),
    ).toBe(true);
  });

  it('never auto-submits an empty or catch-seeded draft', async () => {
    emptyHarvestDraft({ species: 'coho' });
    expect(await getLocalDb().harvestRecords.count()).toBe(0);

    const catchRow = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'pink',
      kept: true,
      geom,
      rigSnapshot: {},
      depthSnapshot: { depthM: 8, assumptions: [] },
    });
    draftFromCatchRecord(catchRow);
    expect(await getLocalDb().harvestRecords.count()).toBe(0);
  });

  it('refuses a second harvest for the same catch', async () => {
    const catchRow = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'sockeye',
      kept: true,
      geom,
      rigSnapshot: {},
      depthSnapshot: { depthM: 10, assumptions: [] },
    });
    const draft = draftFromCatchRecord(catchRow);
    await confirmHarvestDraft({ draft, orgId: 'org1' });
    await expect(confirmHarvestDraft({ draft, orgId: 'org1' })).rejects.toThrow(
      /already exists/i,
    );
  });
});
