import type { ServerSyncOp, SyncOp } from '@troll/shared';

export type StoredSyncOp = ServerSyncOp & {
  readonly orgId: string;
};

export type SyncStore = {
  findById(orgId: string, opId: string): Promise<StoredSyncOp | null>;
  insert(op: StoredSyncOp): Promise<void>;
  listAfter(
    orgId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ ops: StoredSyncOp[]; hasMore: boolean }>;
};

/** Cursor format: `${appliedAt}|${id}` — stable, resumable. */
export function encodeSyncCursor(op: Pick<StoredSyncOp, 'appliedAt' | 'id'>): string {
  return `${op.appliedAt}|${op.id}`;
}

export function decodeSyncCursor(
  cursor: string | undefined,
): { appliedAt: string; id: string } | null {
  if (!cursor) return null;
  const sep = cursor.indexOf('|');
  if (sep <= 0) return null;
  return {
    appliedAt: cursor.slice(0, sep),
    id: cursor.slice(sep + 1),
  };
}

/** In-memory store for tests and local API without Postgres. */
export class MemorySyncStore implements SyncStore {
  private readonly byOrg = new Map<string, StoredSyncOp[]>();

  async findById(orgId: string, opId: string): Promise<StoredSyncOp | null> {
    const rows = this.byOrg.get(orgId) ?? [];
    return rows.find((r) => r.id === opId) ?? null;
  }

  async insert(op: StoredSyncOp): Promise<void> {
    const rows = this.byOrg.get(op.orgId) ?? [];
    rows.push(op);
    rows.sort((a, b) => {
      if (a.appliedAt === b.appliedAt) return a.id.localeCompare(b.id);
      return a.appliedAt.localeCompare(b.appliedAt);
    });
    this.byOrg.set(op.orgId, rows);
  }

  async listAfter(
    orgId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ ops: StoredSyncOp[]; hasMore: boolean }> {
    const decoded = decodeSyncCursor(cursor);
    const rows = this.byOrg.get(orgId) ?? [];
    const filtered = rows.filter((r) => {
      if (!decoded) return true;
      if (r.appliedAt > decoded.appliedAt) return true;
      if (r.appliedAt < decoded.appliedAt) return false;
      return r.id > decoded.id;
    });
    const ops = filtered.slice(0, limit);
    return { ops, hasMore: filtered.length > ops.length };
  }

  /** Test helper */
  seed(ops: StoredSyncOp[]): void {
    for (const op of ops) {
      const rows = this.byOrg.get(op.orgId) ?? [];
      rows.push(op);
      this.byOrg.set(op.orgId, rows);
    }
  }

  clear(): void {
    this.byOrg.clear();
  }
}

export function toServerOp(stored: StoredSyncOp): ServerSyncOp {
  const { orgId: _orgId, ...rest } = stored;
  return rest;
}

export function fromClientOp(
  orgId: string,
  op: SyncOp,
  appliedAt: string,
): StoredSyncOp {
  return {
    ...op,
    orgId,
    appliedAt,
    payload: { ...op.payload },
  };
}
