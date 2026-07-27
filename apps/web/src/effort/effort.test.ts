import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { catchPerHour } from '@troll/engine';
import { logCatch } from '../catches/log-catch.js';
import {
  TrollDatabase,
  getLocalDb,
  setLocalDb,
} from '../db/database.js';
import type { TripRecord } from '../db/types.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import {
  listOrgEffortSamples,
  orgCatchPerHour,
  recordTripEffort,
} from './record.js';

describe('effort logging', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`troll-effort-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    const db = getLocalDb();
    db.close();
    await db.delete();
  });

  async function seedOrg(): Promise<string> {
    const orgId = ulid();
    await writeLocal(
      'orgs',
      {
        id: orgId,
        name: 'Personal',
        kind: 'PERSONAL',
        createdAt: '2026-07-27T09:00:00.000Z',
      },
      { orgId, opType: 'create' },
    );
    return orgId;
  }

  async function seedTrip(
    orgId: string,
    catchCount: number,
    hours: number,
  ): Promise<TripRecord> {
    const tripId = ulid();
    const startedAt = '2026-07-27T10:00:00.000Z';
    const closedAt = new Date(
      Date.parse(startedAt) + hours * 3_600_000,
    ).toISOString();
    const trip: TripRecord = {
      id: tripId,
      orgId,
      startedAt,
      closedAt,
    };
    await writeLocal('trips', trip, { orgId, opType: 'create' });

    for (let i = 0; i < catchCount; i++) {
      await logCatch({
        orgId,
        tripId,
        species: 'king',
        kept: true,
        geom: { type: 'Point', coordinates: [-131.6, 55.3] },
        rigSnapshot: { delivery: 'DOWNRIGGER' },
        depthSnapshot: { lureDepthM: 20 },
      });
    }
    return trip;
  }

  it('records a zero-catch trip and uses it in CPUE', async () => {
    const orgId = await seedOrg();
    const blank = await seedTrip(orgId, 0, 4);
    const productive = await seedTrip(orgId, 2, 2);

    const blankEffort = await recordTripEffort(blank);
    expect(blankEffort.effort.catchCount).toBe(0);
    expect(blankEffort.effort.durationHours).toBe(4);

    const prodEffort = await recordTripEffort(productive);
    expect(prodEffort.effort.catchCount).toBe(2);

    const samples = await listOrgEffortSamples(orgId);
    expect(samples.some((s) => s.catchCount === 0)).toBe(true);

    const rate = await orgCatchPerHour(orgId);
    expect(rate.zeroCatchTrips).toBe(1);
    expect(rate.effortHours).toBe(6);
    expect(rate.catchPerHour).toBeCloseTo(2 / 6, 8);

    const naive = catchPerHour(samples.filter((s) => s.catchCount > 0));
    expect(naive.catchPerHour!).toBeGreaterThan(rate.catchPerHour!);
  });

  it('is idempotent per trip', async () => {
    const orgId = await seedOrg();
    const trip = await seedTrip(orgId, 0, 1);
    const a = await recordTripEffort(trip);
    const b = await recordTripEffort(trip);
    expect(b.effort.id).toBe(a.effort.id);
    expect(await getLocalDb().effortLogs.count()).toBe(1);
  });
});
