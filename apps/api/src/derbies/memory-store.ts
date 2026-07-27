import type {
  DerbyStore,
  SeedDerbyInput,
  StoredDerby,
  StoredDerbyEntry,
  StoredWeighIn,
} from './types.js';

export class MemoryDerbyStore implements DerbyStore {
  private readonly bySlug = new Map<string, StoredDerby>();
  private readonly byId = new Map<string, StoredDerby>();
  private readonly entries = new Map<string, StoredDerbyEntry>();
  private readonly bySession = new Map<string, string>();
  private readonly byTicket = new Map<string, string>();
  private readonly weighIns = new Map<string, StoredWeighIn>();

  seed(input: SeedDerbyInput): StoredDerby {
    const derby: StoredDerby = {
      id: input.id,
      orgId: input.orgId,
      slug: input.slug,
      name: input.name,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      rules: input.rules,
    };
    void this.putDerby(derby);
    return derby;
  }

  async putDerby(derby: StoredDerby): Promise<void> {
    this.bySlug.set(derby.slug, derby);
    this.byId.set(derby.id, derby);
  }

  async getBySlug(slug: string): Promise<StoredDerby | null> {
    return this.bySlug.get(slug) ?? null;
  }

  async getById(derbyId: string): Promise<StoredDerby | null> {
    return this.byId.get(derbyId) ?? null;
  }

  async putEntry(entry: StoredDerbyEntry): Promise<void> {
    const prior = this.entries.get(entry.id);
    if (prior?.stripeSessionId) this.bySession.delete(prior.stripeSessionId);
    if (prior?.ticketCode) this.byTicket.delete(prior.ticketCode);
    this.entries.set(entry.id, entry);
    if (entry.stripeSessionId) this.bySession.set(entry.stripeSessionId, entry.id);
    if (entry.ticketCode) this.byTicket.set(entry.ticketCode, entry.id);
  }

  async listEntries(derbyId: string): Promise<StoredDerbyEntry[]> {
    return [...this.entries.values()].filter((e) => e.derbyId === derbyId);
  }

  async getEntry(entryId: string): Promise<StoredDerbyEntry | null> {
    return this.entries.get(entryId) ?? null;
  }

  async getEntryByStripeSession(
    sessionId: string,
  ): Promise<StoredDerbyEntry | null> {
    const id = this.bySession.get(sessionId);
    return id ? (this.entries.get(id) ?? null) : null;
  }

  async getEntryByTicketCode(
    ticketCode: string,
  ): Promise<StoredDerbyEntry | null> {
    const id = this.byTicket.get(ticketCode.toUpperCase());
    return id ? (this.entries.get(id) ?? null) : null;
  }

  async putWeighIn(weighIn: StoredWeighIn): Promise<void> {
    this.weighIns.set(weighIn.id, weighIn);
  }

  async listWeighIns(derbyId: string): Promise<StoredWeighIn[]> {
    return [...this.weighIns.values()].filter((w) => w.derbyId === derbyId);
  }
}
