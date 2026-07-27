import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TrollDatabase,
  getLocalDb,
  resetLocalDb,
  setLocalDb,
} from './database.js';
import { dequeueSyncOps, listPendingSyncOps, writeLocal } from './write.js';
import { ulid } from './ulid.js';
import type { DomainTableName } from './types.js';

describe('TrollDatabase', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`troll-test-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    const db = getLocalDb();
    db.close();
    await db.delete();
  });

  it('opens with every domain table plus syncQueue and bundles', async () => {
    const db = getLocalDb();
    const tables: DomainTableName[] = [
      'orgs',
      'users',
      'memberships',
      'boats',
      'rigs',
      'gearItems',
      'trips',
      'trackPoints',
      'catches',
      'photos',
      'spots',
      'probes',
      'probeSamples',
      'calibrationFits',
      'regulations',
      'harvestRecords',
      'bundles',
      'recommendations',
      'recommendationFeedback',
      'effortLogs',
      'syncQueue',
    ];

    for (const name of tables) {
      expect(db.table(name)).toBeDefined();
      expect(await db.table(name).count()).toBe(0);
    }
  });

  it('writes to IndexedDB first and enqueues a sync op', async () => {
    const orgId = ulid();
    const boatId = ulid();
    const now = new Date().toISOString();

    await writeLocal(
      'orgs',
      { id: orgId, name: 'Personal', kind: 'PERSONAL', createdAt: now },
      { orgId, opType: 'create' },
    );

    await writeLocal(
      'boats',
      {
        id: boatId,
        orgId,
        name: 'Skiff',
        hasPaddleWheel: true,
        hasN2K: false,
        hasProbe: false,
        updatedAt: now,
      },
      { orgId, opType: 'create' },
    );

    const boat = await getLocalDb().boats.get(boatId);
    expect(boat?.name).toBe('Skiff');

    const pending = await listPendingSyncOps(orgId);
    expect(pending).toHaveLength(2);
    expect(pending.map((op) => op.entity).sort()).toEqual(['Boat', 'Org']);
    expect(pending.every((op) => op.attempts === 0)).toBe(true);
  });

  it('can persist without enqueueing (inbound sync apply)', async () => {
    const orgId = ulid();
    await writeLocal(
      'orgs',
      {
        id: orgId,
        name: 'From server',
        kind: 'PERSONAL',
        createdAt: new Date().toISOString(),
      },
      { orgId, enqueue: false },
    );

    expect(await listPendingSyncOps(orgId)).toHaveLength(0);
    expect(await getLocalDb().orgs.get(orgId)).toBeTruthy();
  });

  it('dequeues only accepted sync ops', async () => {
    const orgId = ulid();
    await writeLocal(
      'spots',
      {
        id: ulid(),
        orgId,
        name: 'Pass',
        geom: { type: 'Point', coordinates: [-131.6, 55.3] },
        isPrivate: true,
        updatedAt: new Date().toISOString(),
      },
      { orgId },
    );
    await writeLocal(
      'spots',
      {
        id: ulid(),
        orgId,
        name: 'Mark',
        geom: { type: 'Point', coordinates: [-131.61, 55.31] },
        isPrivate: true,
        updatedAt: new Date().toISOString(),
      },
      { orgId },
    );

    const pending = await listPendingSyncOps(orgId);
    expect(pending).toHaveLength(2);
    const keep = pending[1]!.id;
    await dequeueSyncOps([pending[0]!.id]);
    const left = await listPendingSyncOps(orgId);
    expect(left).toHaveLength(1);
    expect(left[0]?.id).toBe(keep);
  });

  it('stores append-only catches with supersedesId', async () => {
    const orgId = ulid();
    const tripId = ulid();
    const firstId = ulid();
    const correctionId = ulid();
    const t = new Date().toISOString();

    await writeLocal(
      'trips',
      { id: tripId, orgId, startedAt: t },
      { orgId },
    );

    await writeLocal(
      'catches',
      {
        id: firstId,
        tripId,
        t,
        geom: { type: 'Point', coordinates: [-131.6, 55.3] },
        species: 'coho',
        kept: false,
        rigSnapshot: { delivery: 'DOWNRIGGER' },
        depthSnapshot: { depthM: 20, assumptions: [] },
        photoKeys: [],
        createdAt: t,
      },
      { orgId, opType: 'create' },
    );

    await writeLocal(
      'catches',
      {
        id: correctionId,
        tripId,
        t,
        geom: { type: 'Point', coordinates: [-131.6, 55.3] },
        species: 'coho',
        massKg: 5.4,
        kept: true,
        rigSnapshot: { delivery: 'DOWNRIGGER' },
        depthSnapshot: { depthM: 20, assumptions: [] },
        photoKeys: [],
        supersedesId: firstId,
        createdAt: new Date().toISOString(),
      },
      { orgId, opType: 'supersede' },
    );

    const rows = await getLocalDb().catches.where('tripId').equals(tripId).toArray();
    expect(rows).toHaveLength(2);
    expect(rows.find((c) => c.id === correctionId)?.supersedesId).toBe(firstId);
  });

  it('stores dock bundles for offline reads', async () => {
    const orgId = ulid();
    const id = ulid();
    await writeLocal(
      'bundles',
      {
        id,
        regionId: 'seak',
        startIso: '2026-07-27T00:00:00.000Z',
        expiresAt: '2026-07-29T00:00:00.000Z',
        generatedAt: '2026-07-27T00:00:00.000Z',
        schemaVersion: 1,
        signature: 'test',
        payload: { tides: [], meta: { regionId: 'seak' } },
      },
      { orgId, enqueue: false },
    );

    const bundle = await getLocalDb().bundles.get(id);
    expect(bundle?.regionId).toBe('seak');
    expect(bundle?.payload.tides).toEqual([]);
  });

  it('resetLocalDb recreates an empty database', async () => {
    const orgId = ulid();
    await writeLocal(
      'orgs',
      {
        id: orgId,
        name: 'X',
        kind: 'PERSONAL',
        createdAt: new Date().toISOString(),
      },
      { orgId, enqueue: false },
    );
    await resetLocalDb();
    expect(await getLocalDb().orgs.count()).toBe(0);
  });
});
