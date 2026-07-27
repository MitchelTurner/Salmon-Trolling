import {
  buildEffortSample,
  catchPerHour,
  type CatchPerHourResult,
  type EffortSample,
} from '@troll/engine';
import { listActiveCatches } from '../catches/index.js';
import { getLocalDb, type TrollDatabase } from '../db/database.js';
import type { EffortRecord, TripRecord } from '../db/types.js';
import { writeLocal } from '../db/write.js';

export type RecordEffortResult = {
  readonly effort: EffortRecord;
  readonly sample: EffortSample;
};

/**
 * Persist effort for a closed trip.
 * Zero-catch trips are first-class — catchCount may be 0.
 */
export async function recordTripEffort(
  trip: TripRecord,
  db: TrollDatabase = getLocalDb(),
): Promise<RecordEffortResult> {
  if (!trip.closedAt) {
    throw new Error('cannot record effort for an open trip');
  }

  const existing = await db.effortLogs.get(trip.id);
  if (existing) {
    return {
      effort: existing,
      sample: buildEffortSample({
        tripId: existing.tripId,
        startedAt: existing.startedAt,
        closedAt: existing.closedAt,
        catchCount: existing.catchCount,
      }),
    };
  }

  const active = await listActiveCatches(trip.id, db);
  const catchCount = active.length;
  const keptCount = active.filter((c) => c.kept).length;
  const sample = buildEffortSample({
    tripId: trip.id,
    startedAt: trip.startedAt,
    closedAt: trip.closedAt,
    catchCount,
  });

  const effort: EffortRecord = {
    id: trip.id,
    tripId: trip.id,
    orgId: trip.orgId,
    startedAt: trip.startedAt,
    closedAt: trip.closedAt,
    durationHours: sample.durationHours,
    catchCount,
    keptCount,
    createdAt: new Date().toISOString(),
  };

  await writeLocal('effortLogs', effort, {
    orgId: trip.orgId,
    opType: 'create',
    db,
  });

  return { effort, sample };
}

export async function listOrgEffortSamples(
  orgId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<EffortSample[]> {
  const rows = await db.effortLogs.where('orgId').equals(orgId).toArray();
  return rows.map((r) =>
    buildEffortSample({
      tripId: r.tripId,
      startedAt: r.startedAt,
      closedAt: r.closedAt,
      catchCount: r.catchCount,
    }),
  );
}

export async function orgCatchPerHour(
  orgId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<CatchPerHourResult> {
  return catchPerHour(await listOrgEffortSamples(orgId, db));
}
