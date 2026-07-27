import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TrollDatabase, getLocalDb, setLocalDb } from '../db/database.js';
import { listPendingSyncOps } from '../db/write.js';
import { ulid } from '../db/ulid.js';
import {
  cacheDerbyTickets,
  findCachedTicket,
  listLocalWeighIns,
  recordWeighInLocal,
} from './weigh-in.js';

describe('offline weigh-in station', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`troll-weighin-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    const db = getLocalDb();
    db.close();
    await db.delete();
  });

  it('records against a cached ticket and enqueues sync', async () => {
    const orgId = ulid();
    await cacheDerbyTickets(orgId, 'ketchikan-king-2026', [
      {
        entryId: 'entry_1',
        ticketCode: 'DERBY-ABC12345',
        displayName: 'Alex River',
        paidAt: '2026-06-01T12:00:00.000Z',
      },
    ]);

    const ticket = await findCachedTicket(
      'ketchikan-king-2026',
      'derby-abc12345',
    );
    expect(ticket?.displayName).toBe('Alex River');

    const row = await recordWeighInLocal({
      orgId,
      operatorId: 'op_1',
      derbySlug: 'ketchikan-king-2026',
      ticketCode: 'DERBY-ABC12345',
      species: 'king',
      massKg: 18.2,
      station: 'thomas-basin',
      witness: 'Dock judge',
    });

    expect(row.displayName).toBe('Alex River');
    expect(row.syncedAt).toBeUndefined();

    const listed = await listLocalWeighIns('ketchikan-king-2026');
    expect(listed).toHaveLength(1);

    const pending = await listPendingSyncOps(orgId);
    expect(pending.some((op) => op.entity === 'WeighIn')).toBe(true);
  });

  it('rejects tickets missing from the local roster', async () => {
    await expect(
      recordWeighInLocal({
        orgId: 'org_1',
        operatorId: 'op_1',
        derbySlug: 'ketchikan-king-2026',
        ticketCode: 'DERBY-MISSING1',
        species: 'king',
        massKg: 10,
        station: 'dock',
      }),
    ).rejects.toThrow(/local roster/);
  });
});
