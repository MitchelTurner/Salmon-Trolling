import { getLocalDb, type TrollDatabase } from '../db/database.js';
import type { CatchRecord, GeoPoint } from '../db/types.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import { attachPhotosToCatch, storePhoto } from './photos.js';

export type LogCatchInput = {
  orgId: string;
  tripId: string;
  species: string;
  kept: boolean;
  /** WGS84 point at the catch moment. */
  geom: GeoPoint;
  /** Frozen rig config — never a live foreign key. */
  rigSnapshot: Record<string, unknown>;
  /** Frozen depth engine output including assumptions. */
  depthSnapshot: Record<string, unknown>;
  lengthM?: number;
  massKg?: number;
  userId?: string;
  t?: string;
  /** Local photo bytes/blobs captured with the catch. */
  photos?: ReadonlyArray<import('./photos.js').PhotoBytes>;
  db?: TrollDatabase;
};

export type CorrectCatchInput = Omit<LogCatchInput, 'tripId' | 'geom'> & {
  /** Catch id being corrected — original row is left untouched. */
  supersedesId: string;
  geom?: GeoPoint;
};

function assertSpecies(species: string): string {
  const trimmed = species.trim();
  if (!trimmed) throw new Error('species is required');
  return trimmed.toLowerCase();
}

/**
 * Append-only catch create. Always snapshots rig + depth; never mutates prior rows.
 */
export async function logCatch(input: LogCatchInput): Promise<CatchRecord> {
  const db = input.db ?? getLocalDb();
  const trip = await db.trips.get(input.tripId);
  if (!trip) throw new Error('trip not found');

  const createdAt = new Date().toISOString();
  const t = input.t ?? createdAt;
  const catchId = ulid();

  const photoKeys: string[] = [];
  if (input.photos) {
    for (const data of input.photos) {
      const photo = await storePhoto({
        tripId: input.tripId,
        data,
        catchId,
        createdAt,
        db,
      });
      photoKeys.push(photo.id);
    }
  }

  const record: CatchRecord = {
    id: catchId,
    tripId: input.tripId,
    userId: input.userId,
    t,
    geom: input.geom,
    species: assertSpecies(input.species),
    lengthM: input.lengthM,
    massKg: input.massKg,
    kept: input.kept,
    rigSnapshot: { ...input.rigSnapshot },
    depthSnapshot: { ...input.depthSnapshot },
    photoKeys,
    createdAt,
  };

  await writeLocal('catches', record, {
    orgId: input.orgId,
    opType: 'create',
    db,
    clientTime: createdAt,
  });

  return record;
}

/**
 * Correction = new append-only event with `supersedesId`.
 * The original catch is never updated in place.
 */
export async function correctCatch(
  input: CorrectCatchInput,
): Promise<CatchRecord> {
  const db = input.db ?? getLocalDb();
  const prior = await db.catches.get(input.supersedesId);
  if (!prior) throw new Error('catch to supersede not found');

  // Prevent chains from silently forking — supersede the head of the chain.
  const already = await db.catches
    .where('supersedesId')
    .equals(input.supersedesId)
    .first();
  if (already) {
    throw new Error(
      `catch ${input.supersedesId} already superseded by ${already.id}`,
    );
  }

  const createdAt = new Date().toISOString();
  const t = input.t ?? createdAt;
  const catchId = ulid();

  const photoKeys: string[] = [];
  if (input.photos) {
    for (const data of input.photos) {
      const photo = await storePhoto({
        tripId: prior.tripId,
        data,
        catchId,
        createdAt,
        db,
      });
      photoKeys.push(photo.id);
    }
  }

  // Carry forward prior photos when no new ones are supplied.
  const finalPhotoKeys =
    photoKeys.length > 0 ? photoKeys : [...prior.photoKeys];
  if (photoKeys.length > 0) {
    await attachPhotosToCatch(photoKeys, catchId, db);
  }

  const record: CatchRecord = {
    id: catchId,
    tripId: prior.tripId,
    userId: input.userId ?? prior.userId,
    t,
    geom: input.geom ?? prior.geom,
    species: assertSpecies(input.species),
    lengthM: input.lengthM ?? prior.lengthM,
    massKg: input.massKg ?? prior.massKg,
    kept: input.kept,
    rigSnapshot: { ...input.rigSnapshot },
    depthSnapshot: { ...input.depthSnapshot },
    photoKeys: finalPhotoKeys,
    supersedesId: input.supersedesId,
    createdAt,
  };

  await writeLocal('catches', record, {
    orgId: input.orgId,
    opType: 'supersede',
    db,
    clientTime: createdAt,
  });

  return record;
}

/** Latest non-superseded catches for a trip (corrections replace heads). */
export async function listActiveCatches(
  tripId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<CatchRecord[]> {
  const all = await db.catches.where('tripId').equals(tripId).sortBy('t');
  const superseded = new Set(
    all.map((c) => c.supersedesId).filter((id): id is string => id != null),
  );
  return all.filter((c) => !superseded.has(c.id));
}
