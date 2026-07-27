/**
 * Offline weigh-in station — IndexedDB first, sync when the dock has signal.
 */

import type { DerbyTicketRosterItem, WeighInRecord } from '@troll/shared';
import { mintDevBundleAuth } from '../bundles/auth.js';
import { getLocalDb } from '../db/database.js';
import type { DerbyTicketRecord, WeighInLocalRecord } from '../db/types.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';

export type RecordWeighInInput = {
  orgId: string;
  operatorId: string;
  derbySlug: string;
  ticketCode: string;
  species: string;
  massKg: number;
  station: string;
  witness?: string;
  photoKeys?: string[];
  t?: string;
};

function normalizeTicket(code: string): string {
  return code.trim().toUpperCase();
}

/** Cache paid tickets locally for offline lookup. */
export async function cacheDerbyTickets(
  orgId: string,
  derbySlug: string,
  tickets: readonly DerbyTicketRosterItem[],
): Promise<number> {
  const db = getLocalDb();
  const cachedAt = new Date().toISOString();
  const prior = await db.derbyTickets.where('derbySlug').equals(derbySlug).toArray();
  await db.transaction('rw', db.derbyTickets, async () => {
    await db.derbyTickets.bulkDelete(prior.map((t) => t.id));
    for (const t of tickets) {
      const row: DerbyTicketRecord = {
        id: t.entryId,
        orgId,
        derbySlug,
        ticketCode: t.ticketCode,
        displayName: t.displayName,
        paidAt: t.paidAt,
        cachedAt,
      };
      await db.derbyTickets.put(row);
    }
  });
  return tickets.length;
}

export async function prefetchDerbyTickets(args: {
  orgId: string;
  userId: string;
  derbySlug: string;
  apiBase: string;
  authorization?: string;
}): Promise<number> {
  const auth =
    args.authorization ?? mintDevBundleAuth(args.orgId, args.userId);
  const res = await fetch(
    `${args.apiBase.replace(/\/$/, '')}/derbies/${encodeURIComponent(args.derbySlug)}/tickets`,
    {
      headers: {
        Authorization: auth,
        Accept: 'application/vnd.troll.v1+json',
      },
    },
  );
  if (!res.ok) throw new Error('Could not prefetch tickets');
  const body = (await res.json()) as { tickets: DerbyTicketRosterItem[] };
  return cacheDerbyTickets(args.orgId, args.derbySlug, body.tickets);
}

export async function findCachedTicket(
  derbySlug: string,
  ticketCode: string,
): Promise<DerbyTicketRecord | undefined> {
  const code = normalizeTicket(ticketCode);
  const rows = await getLocalDb()
    .derbyTickets.where('[derbySlug+ticketCode]')
    .equals([derbySlug, code])
    .toArray();
  return rows[0];
}

/**
 * Persist a weigh-in locally (works offline). Enqueues sync; optional immediate flush.
 */
export async function recordWeighInLocal(
  input: RecordWeighInInput,
): Promise<WeighInLocalRecord> {
  const ticket = await findCachedTicket(input.derbySlug, input.ticketCode);
  if (!ticket) {
    throw new Error('ticket not in local roster — prefetch while online');
  }

  const createdAt = new Date().toISOString();
  const id = ulid();
  const row: WeighInLocalRecord = {
    id,
    orgId: input.orgId,
    derbySlug: input.derbySlug,
    entryId: ticket.id,
    ticketCode: ticket.ticketCode,
    displayName: ticket.displayName,
    species: input.species.trim(),
    massKg: input.massKg,
    t: input.t ?? createdAt,
    station: input.station.trim(),
    operatorId: input.operatorId,
    witness: input.witness?.trim() || undefined,
    photoKeys: input.photoKeys ?? [],
    createdAt,
  };

  await writeLocal('weighIns', row, {
    orgId: input.orgId,
    opType: 'create',
    clientTime: row.t,
  });
  return row;
}

/** Push unsynced local weigh-ins to the API (idempotent by clientId). */
export async function flushPendingWeighIns(args: {
  orgId: string;
  userId: string;
  derbySlug: string;
  apiBase: string;
  authorization?: string;
}): Promise<{ synced: number; failed: number }> {
  const db = getLocalDb();
  const pending = await db.weighIns
    .where('derbySlug')
    .equals(args.derbySlug)
    .filter((w) => w.orgId === args.orgId && !w.syncedAt)
    .toArray();

  const auth =
    args.authorization ?? mintDevBundleAuth(args.orgId, args.userId);
  const base = args.apiBase.replace(/\/$/, '');
  let synced = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const res = await fetch(
        `${base}/derbies/${encodeURIComponent(args.derbySlug)}/weighins`,
        {
          method: 'POST',
          headers: {
            Authorization: auth,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.troll.v1+json',
          },
          body: JSON.stringify({
            clientId: row.id,
            ticketCode: row.ticketCode,
            species: row.species,
            massKg: row.massKg,
            station: row.station,
            t: row.t,
            witness: row.witness,
            photoKeys: row.photoKeys,
          }),
        },
      );
      if (!res.ok) {
        failed += 1;
        continue;
      }
      const body = (await res.json()) as { weighIn: WeighInRecord };
      const next: WeighInLocalRecord = {
        ...row,
        serverId: body.weighIn.id,
        syncedAt: new Date().toISOString(),
      };
      await db.weighIns.put(next);
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function listLocalWeighIns(
  derbySlug: string,
): Promise<WeighInLocalRecord[]> {
  return getLocalDb()
    .weighIns.where('derbySlug')
    .equals(derbySlug)
    .reverse()
    .sortBy('t');
}
