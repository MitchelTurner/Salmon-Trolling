import type {
  CatchLookup,
  CatchLookupRow,
  FishTagStore,
  StoredFishTag,
} from './types.js';

export class MemoryFishTagStore implements FishTagStore {
  private readonly byCode = new Map<string, StoredFishTag>();
  private readonly byCatch = new Map<string, StoredFishTag>();

  async put(tag: StoredFishTag): Promise<void> {
    this.byCode.set(tag.code, tag);
    this.byCatch.set(tag.catchId, tag);
  }

  async getByCatchId(catchId: string): Promise<StoredFishTag | null> {
    return this.byCatch.get(catchId) ?? null;
  }

  async getByCode(code: string): Promise<StoredFishTag | null> {
    return this.byCode.get(code.toUpperCase()) ?? null;
  }

  async update(tag: StoredFishTag): Promise<void> {
    await this.put(tag);
  }
}

export class MemoryCatchLookup implements CatchLookup {
  private readonly rows = new Map<string, CatchLookupRow>();

  seed(row: CatchLookupRow): void {
    this.rows.set(`${row.orgId}:${row.id}`, row);
  }

  async get(orgId: string, catchId: string): Promise<CatchLookupRow | null> {
    return this.rows.get(`${orgId}:${catchId}`) ?? null;
  }
}
