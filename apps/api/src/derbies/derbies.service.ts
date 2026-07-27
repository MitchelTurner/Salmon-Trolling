import { Inject, Injectable } from '@nestjs/common';
import {
  mintDerbyTicketCode,
  rankLeaderboard,
  type CompleteDerbyRegistrationBody,
  type CreateWeighInBody,
  type DerbyRegistrationReceipt,
  type DerbyTicketRosterItem,
  type PublicLeaderboard,
  type RegisterDerbyBody,
  type WeighInRecord,
} from '@troll/shared';
import { randomUUID } from 'node:crypto';
import {
  STRIPE_GATEWAY,
  type StripeGateway,
} from '../billing/types.js';
import {
  DERBY_STORE,
  type DerbyStore,
  type StoredDerbyEntry,
  type StoredWeighIn,
} from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

function toReceipt(
  slug: string,
  entry: StoredDerbyEntry,
): DerbyRegistrationReceipt {
  return {
    entryId: entry.id,
    slug,
    displayName: entry.displayName,
    paid: Boolean(entry.paidAt),
    waiverAt: entry.waiverAt,
    ticketCode: entry.ticketCode,
    checkoutUrl: entry.paidAt ? undefined : entry.checkoutUrl,
    checkoutSessionId: entry.paidAt ? undefined : entry.stripeSessionId,
  };
}

@Injectable()
export class DerbiesService {
  constructor(
    @Inject(DERBY_STORE) private readonly store: DerbyStore,
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
  ) {}

  /**
   * Public leaderboard for GET /derbies/:slug — no login, no PII beyond display names.
   */
  async leaderboard(slug: string): Promise<PublicLeaderboard | null> {
    const derby = await this.store.getBySlug(slug);
    if (!derby) return null;

    const [entries, weighIns] = await Promise.all([
      this.store.listEntries(derby.id),
      this.store.listWeighIns(derby.id),
    ]);

    const entryById = new Map(entries.map((e) => [e.id, e]));
    const rows = weighIns.map((w) => {
      const entry = entryById.get(w.entryId);
      return {
        weighInId: w.id,
        displayName: entry?.displayName ?? 'Unknown',
        species: w.species,
        massKg: w.massKg,
        weighedAt: w.t,
        station: w.station,
        witness: w.witness,
        hasPhoto: w.photoKeys.length > 0,
        voidedAt: w.voidedAt,
      };
    });

    const ranked = rankLeaderboard(rows);
    const registeredCount = entries.filter((e) => e.paidAt).length;

    return {
      slug: derby.slug,
      name: derby.name,
      startsAt: derby.startsAt,
      endsAt: derby.endsAt,
      rules: derby.rules,
      entries: ranked,
      registeredCount,
      weighInCount: ranked.length,
    };
  }

  /**
   * POST /derbies/:slug/register — Stripe checkout + waiver + pending ticket.
   */
  async register(
    slug: string,
    body: RegisterDerbyBody,
  ): Promise<DerbyRegistrationReceipt> {
    const derby = await this.store.getBySlug(slug);
    if (!derby) throw new Error('derby not found');

    const entryId = newId('dentry');
    const waiverAt = new Date().toISOString();
    const checkout = await this.stripe.createCheckoutSession({
      orgId: derby.orgId,
      customerEmail: body.email,
      priceId: process.env.STRIPE_PRICE_DERBY_TICKET ?? 'price_derby_ticket_test',
      mode: 'payment',
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      seasonPass: false,
      metadata: {
        kind: 'derby_ticket',
        derbyId: derby.id,
        derbySlug: derby.slug,
        entryId,
      },
    });

    const entry: StoredDerbyEntry = {
      id: entryId,
      derbyId: derby.id,
      displayName: body.displayName.trim(),
      email: body.email.toLowerCase(),
      stripeSessionId: checkout.sessionId,
      checkoutUrl: checkout.url,
      waiverAt,
      waiverSignerName: body.waiver.signerName.trim(),
      waiverSignatureData: body.waiver.signatureData,
    };
    await this.store.putEntry(entry);
    return toReceipt(derby.slug, entry);
  }

  /**
   * Mark registration paid and issue ticket (Stripe success / webhook / test hook).
   * Idempotent by session id.
   */
  async completeRegistration(
    slug: string,
    body: CompleteDerbyRegistrationBody,
  ): Promise<DerbyRegistrationReceipt> {
    const derby = await this.store.getBySlug(slug);
    if (!derby) throw new Error('derby not found');

    const entry = await this.store.getEntryByStripeSession(body.sessionId);
    if (!entry || entry.derbyId !== derby.id) {
      throw new Error('registration session not found');
    }

    if (entry.paidAt && entry.ticketCode) {
      return toReceipt(derby.slug, entry);
    }

    const ticketCode =
      entry.ticketCode ?? mintDerbyTicketCode(randomUUID());
    const next: StoredDerbyEntry = {
      ...entry,
      paidAt: entry.paidAt ?? new Date().toISOString(),
      ticketCode,
    };
    await this.store.putEntry(next);
    return toReceipt(derby.slug, next);
  }

  /**
   * Paid ticket roster for station prefetch — dock is often offline.
   */
  async listTickets(
    slug: string,
    orgId: string,
  ): Promise<DerbyTicketRosterItem[] | null> {
    const derby = await this.requireOrgDerby(slug, orgId);
    if (!derby) return null;
    const entries = await this.store.listEntries(derby.id);
    return entries
      .filter((e) => e.paidAt && e.ticketCode)
      .map((e) => ({
        entryId: e.id,
        ticketCode: e.ticketCode!,
        displayName: e.displayName,
        paidAt: e.paidAt!,
      }))
      .sort((a, b) => a.ticketCode.localeCompare(b.ticketCode));
  }

  /**
   * POST /derbies/:slug/weighins — station operator; idempotent by clientId.
   */
  async createWeighIn(
    slug: string,
    orgId: string,
    operatorId: string,
    body: CreateWeighInBody,
  ): Promise<WeighInRecord> {
    const derby = await this.requireOrgDerby(slug, orgId);
    if (!derby) throw new Error('derby not found');

    const existing = await this.store.getWeighInByClientId(body.clientId);
    if (existing) {
      if (existing.derbyId !== derby.id) {
        throw new Error('clientId already used for another derby');
      }
      return this.toWeighInRecord(existing);
    }

    const entry = await this.store.getEntryByTicketCode(body.ticketCode);
    if (!entry || entry.derbyId !== derby.id) {
      throw new Error('ticket not found');
    }
    if (!entry.paidAt || !entry.ticketCode) {
      throw new Error('ticket not paid');
    }

    const species = body.species.trim().toLowerCase();
    const eligible = derby.rules.eligibleSpecies.map((s) => s.toLowerCase());
    if (!eligible.includes(species)) {
      throw new Error(
        `species "${body.species}" not eligible for this derby`,
      );
    }
    if (derby.rules.minMassKg != null && body.massKg < derby.rules.minMassKg) {
      throw new Error(
        `mass below derby minimum (${derby.rules.minMassKg} kg)`,
      );
    }

    const weighIn: StoredWeighIn = {
      id: newId('wi'),
      clientId: body.clientId,
      derbyId: derby.id,
      entryId: entry.id,
      species: body.species.trim(),
      massKg: body.massKg,
      t: body.t,
      station: body.station.trim(),
      operatorId,
      witness: body.witness?.trim() || undefined,
      photoKeys: body.photoKeys ?? [],
    };
    await this.store.putWeighIn(weighIn);
    return this.toWeighInRecord(weighIn);
  }

  private async requireOrgDerby(slug: string, orgId: string) {
    const derby = await this.store.getBySlug(slug);
    if (!derby) return null;
    if (derby.orgId !== orgId) throw new Error('derby not in this org');
    return derby;
  }

  private async toWeighInRecord(w: StoredWeighIn): Promise<WeighInRecord> {
    const entry = await this.store.getEntry(w.entryId);
    return {
      id: w.id,
      clientId: w.clientId,
      derbyId: w.derbyId,
      entryId: w.entryId,
      ticketCode: entry?.ticketCode ?? 'DERBY-XXXXXXXX',
      displayName: entry?.displayName ?? 'Unknown',
      species: w.species,
      massKg: w.massKg,
      t: w.t,
      station: w.station,
      operatorId: w.operatorId,
      witness: w.witness,
      photoKeys: [...w.photoKeys],
      voidedAt: w.voidedAt ?? null,
    };
  }
}
