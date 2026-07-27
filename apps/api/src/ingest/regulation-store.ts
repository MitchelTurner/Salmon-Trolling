export type StoredRegulation = {
  id: string;
  regionId: string;
  kind: string;
  species?: string;
  body: Record<string, unknown>;
  sourceUrl: string;
  fetchedAt: string;
  effectiveAt?: string;
  supersededAt?: string;
  parseOk: boolean;
  /** Hash of the scraped payload for change detection. */
  contentHash: string;
  nrId: string;
};

export interface RegulationStore {
  getByNrId(regionId: string, nrId: string): Promise<StoredRegulation | undefined>;
  listActive(regionId: string): Promise<StoredRegulation[]>;
  /** Active + parse-failed rows — never hide parseOk=false. */
  listSurfaced(regionId: string): Promise<StoredRegulation[]>;
  put(record: StoredRegulation): Promise<StoredRegulation>;
  supersede(id: string, at: string): Promise<void>;
}

export class MemoryRegulationStore implements RegulationStore {
  private readonly rows = new Map<string, StoredRegulation>();

  async getByNrId(
    regionId: string,
    nrId: string,
  ): Promise<StoredRegulation | undefined> {
    const matches = [...this.rows.values()].filter(
      (r) =>
        r.regionId === regionId &&
        r.nrId === nrId &&
        r.supersededAt === undefined,
    );
    // Prefer a successful parse; failed parses are surfaced alongside, not instead.
    return matches.find((r) => r.parseOk) ?? matches[0];
  }

  async listActive(regionId: string): Promise<StoredRegulation[]> {
    return [...this.rows.values()].filter(
      (r) =>
        r.regionId === regionId &&
        r.supersededAt === undefined &&
        r.parseOk,
    );
  }

  async listSurfaced(regionId: string): Promise<StoredRegulation[]> {
    return [...this.rows.values()]
      .filter((r) => r.regionId === regionId && r.supersededAt === undefined)
      .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  }

  async put(record: StoredRegulation): Promise<StoredRegulation> {
    this.rows.set(record.id, record);
    return record;
  }

  async supersede(id: string, at: string): Promise<void> {
    const row = this.rows.get(id);
    if (!row) return;
    this.rows.set(id, { ...row, supersededAt: at });
  }
}
