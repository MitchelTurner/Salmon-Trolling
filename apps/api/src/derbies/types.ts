import type { Derby, DerbyRules } from '@troll/shared';

export const DERBY_STORE = Symbol('DERBY_STORE');

export type StoredDerby = Derby;

export type StoredDerbyEntry = {
  readonly id: string;
  readonly derbyId: string;
  readonly displayName: string;
  readonly email: string;
  readonly stripeSessionId?: string;
  readonly checkoutUrl?: string;
  readonly paidAt?: string;
  readonly waiverAt?: string;
  readonly waiverSignerName?: string;
  readonly waiverSignatureData?: string;
  /** Issued only after payment. */
  readonly ticketCode?: string;
};

export type StoredWeighIn = {
  readonly id: string;
  /** Client ULID — offline idempotency key. */
  readonly clientId: string;
  readonly derbyId: string;
  readonly entryId: string;
  readonly species: string;
  readonly massKg: number;
  readonly t: string;
  readonly station: string;
  readonly operatorId: string;
  readonly witness?: string;
  readonly photoKeys: readonly string[];
  readonly voidedAt?: string | null;
  readonly voidReason?: string | null;
};

export type SeedDerbyInput = {
  readonly id: string;
  readonly orgId: string;
  readonly slug: string;
  readonly name: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly rules: DerbyRules;
};

export interface DerbyStore {
  putDerby(derby: StoredDerby): Promise<void>;
  getBySlug(slug: string): Promise<StoredDerby | null>;
  getById(derbyId: string): Promise<StoredDerby | null>;
  putEntry(entry: StoredDerbyEntry): Promise<void>;
  listEntries(derbyId: string): Promise<StoredDerbyEntry[]>;
  getEntry(entryId: string): Promise<StoredDerbyEntry | null>;
  getEntryByStripeSession(
    sessionId: string,
  ): Promise<StoredDerbyEntry | null>;
  getEntryByTicketCode(ticketCode: string): Promise<StoredDerbyEntry | null>;
  putWeighIn(weighIn: StoredWeighIn): Promise<void>;
  getWeighInByClientId(clientId: string): Promise<StoredWeighIn | null>;
  listWeighIns(derbyId: string): Promise<StoredWeighIn[]>;
}
