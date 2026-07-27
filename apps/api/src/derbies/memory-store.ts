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

  async putEntry(entry: StoredDerbyEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async listEntries(derbyId: string): Promise<StoredDerbyEntry[]> {
    return [...this.entries.values()].filter((e) => e.derbyId === derbyId);
  }

  async getEntry(entryId: string): Promise<StoredDerbyEntry | null> {
    return this.entries.get(entryId) ?? null;
  }

  async putWeighIn(weighIn: StoredWeighIn): Promise<void> {
    this.weighIns.set(weighIn.id, weighIn);
  }

  async listWeighIns(derbyId: string): Promise<StoredWeighIn[]> {
    return [...this.weighIns.values()].filter((w) => w.derbyId === derbyId);
  }
}
