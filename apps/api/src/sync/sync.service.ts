import { Inject, Injectable } from '@nestjs/common';
import {
  SYNC_BATCH_MAX,
  type SyncOp,
  type SyncOpResult,
  type SyncRequest,
  type SyncResponse,
} from '@troll/shared';
import type { OrgContext } from '../auth/org-context.js';
import {
  encodeSyncCursor,
  fromClientOp,
  toServerOp,
  type SyncStore,
} from './sync.store.js';

export const SYNC_STORE = Symbol('SYNC_STORE');

const APPEND_ONLY = new Set(['Catch', 'TrackPoint']);

@Injectable()
export class SyncService {
  constructor(@Inject(SYNC_STORE) private readonly store: SyncStore) {}

  async sync(org: OrgContext, body: SyncRequest): Promise<SyncResponse> {
    const results: SyncOpResult[] = [];
    const appliedAt = new Date().toISOString();

    for (const op of body.ops) {
      results.push(await this.applyOne(org.orgId, op, appliedAt));
    }

    const pullLimit = body.pullLimit ?? SYNC_BATCH_MAX;
    const { ops, hasMore } = await this.store.listAfter(
      org.orgId,
      body.cursor,
      pullLimit,
    );

    const last = ops[ops.length - 1];
    return {
      generatedAt: new Date().toISOString(),
      results,
      serverOps: ops.map(toServerOp),
      nextCursor: last ? encodeSyncCursor(last) : body.cursor ?? null,
      hasMore,
    };
  }

  private async applyOne(
    orgId: string,
    op: SyncOp,
    appliedAt: string,
  ): Promise<SyncOpResult> {
    const existing = await this.store.findById(orgId, op.id);
    if (existing) {
      return { id: op.id, status: 'duplicate' };
    }

    const rejection = validateOp(op);
    if (rejection) {
      return { id: op.id, status: 'rejected', detail: rejection };
    }

    await this.store.insert(fromClientOp(orgId, op, appliedAt));
    return { id: op.id, status: 'accepted' };
  }
}

function validateOp(op: SyncOp): string | null {
  if (!op.entity.trim()) return 'entity is required';
  if (typeof op.payload.id !== 'string' || op.payload.id.length === 0) {
    return 'payload.id is required';
  }
  if (APPEND_ONLY.has(op.entity) && op.opType === 'update') {
    return `${op.entity} is append-only; use create or supersede`;
  }
  if (op.opType === 'supersede') {
    if (
      typeof op.payload.supersedesId !== 'string' ||
      op.payload.supersedesId.length === 0
    ) {
      return 'supersede requires payload.supersedesId';
    }
  }
  return null;
}
