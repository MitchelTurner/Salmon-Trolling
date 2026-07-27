import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getLocalDb, setLocalDb, TrollDatabase } from '../db/database.js';
import { listPendingSyncOps } from '../db/write.js';
import { ulid } from '../db/ulid.js';
import { correctCatch, listActiveCatches, logCatch } from './log-catch.js';
import { storePhoto } from './photos.js';

const geom = {
  type: 'Point' as const,
  coordinates: [-131.6, 55.3] as [number, number],
};

describe('catch logging', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`catch-test-${ulid()}`);
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
  });

  it('appends a catch with rig and depth snapshots and enqueues sync', async () => {
    const row = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'Coho',
      kept: false,
      geom,
      lengthM: 0.7,
      massKg: 3.2,
      rigSnapshot: { delivery: 'DOWNRIGGER', cableOutFt: '100' },
      depthSnapshot: {
        depthM: 18.5,
        assumptions: ['STW from paddle wheel'],
        confidence: 'measured',
      },
    });

    expect(row.species).toBe('coho');
    expect(row.rigSnapshot.delivery).toBe('DOWNRIGGER');
    expect(row.depthSnapshot.depthM).toBe(18.5);
    expect(row.supersedesId).toBeUndefined();

    const pending = await listPendingSyncOps('org1');
    expect(pending.some((op) => op.entity === 'Catch' && op.opType === 'create')).toBe(
      true,
    );
  });

  it('never mutates the original when correcting via supersedesId', async () => {
    const first = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'coho',
      kept: false,
      geom,
      massKg: 2,
      rigSnapshot: { delivery: 'DIVER' },
      depthSnapshot: { depthM: 10, assumptions: [] },
    });

    const correction = await correctCatch({
      orgId: 'org1',
      supersedesId: first.id,
      species: 'coho',
      kept: true,
      massKg: 4.5,
      rigSnapshot: { delivery: 'DIVER' },
      depthSnapshot: { depthM: 10, assumptions: [] },
    });

    expect(correction.supersedesId).toBe(first.id);
    expect(correction.kept).toBe(true);
    expect(correction.massKg).toBe(4.5);

    const original = await getLocalDb().catches.get(first.id);
    expect(original?.kept).toBe(false);
    expect(original?.massKg).toBe(2);
    expect(original?.supersedesId).toBeUndefined();

    const active = await listActiveCatches('trip1');
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(correction.id);

    const pending = await listPendingSyncOps('org1');
    expect(
      pending.some((op) => op.entity === 'Catch' && op.opType === 'supersede'),
    ).toBe(true);
  });

  it('stores photo blobs locally and references them from the catch', async () => {
    const bytes = new TextEncoder().encode('fake-image');
    const row = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'chinook',
      kept: true,
      geom,
      rigSnapshot: { delivery: 'LEADCORE' },
      depthSnapshot: { depthM: 12, assumptions: [] },
      photos: [bytes],
    });

    expect(row.photoKeys).toHaveLength(1);
    const photo = await getLocalDb().photos.get(row.photoKeys[0]!);
    expect(photo?.mimeType).toBe('image/jpeg');
    expect(photo?.catchId).toBe(row.id);
    expect(photo?.byteLength).toBe(bytes.byteLength);
    expect(photo?.bytes.byteLength).toBe(bytes.byteLength);

    // Photo blobs are not dumped into the sync queue payload.
    const pending = await listPendingSyncOps('org1');
    const catchOp = pending.find((op) => op.entity === 'Catch');
    expect(catchOp?.payload.photoKeys).toEqual(row.photoKeys);
    expect(pending.some((op) => op.entity === 'Photo')).toBe(false);
  });

  it('can store a photo before attach', async () => {
    const photo = await storePhoto({
      tripId: 'trip1',
      data: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png',
    });
    expect(photo.catchId).toBeUndefined();
    expect(photo.mimeType).toBe('image/png');
    expect(await getLocalDb().photos.count()).toBe(1);
  });
});
