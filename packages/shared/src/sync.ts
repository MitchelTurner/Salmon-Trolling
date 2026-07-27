import { z } from 'zod';

/** Max ops per POST /sync batch. Larger queues resume across requests. */
export const SYNC_BATCH_MAX = 50;

export const SyncOpTypeSchema = z.enum(['create', 'update', 'supersede']);

export const SyncOpSchema = z.object({
  /** Client-generated ULID — idempotency key. */
  id: z.string().min(1),
  entity: z.string().min(1),
  opType: SyncOpTypeSchema,
  payload: z.record(z.unknown()),
  clientTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

export const SyncRequestSchema = z.object({
  /**
   * Opaque cursor from a prior response (`nextCursor`).
   * Pulls server ops the client has not seen.
   */
  cursor: z.string().min(1).optional(),
  ops: z.array(SyncOpSchema).max(SYNC_BATCH_MAX),
  /** Optional pull page size (server ops). */
  pullLimit: z.number().int().positive().max(200).optional(),
});

export const SyncOpResultStatusSchema = z.enum([
  'accepted',
  'duplicate',
  'rejected',
]);

export const SyncOpResultSchema = z.object({
  id: z.string().min(1),
  status: SyncOpResultStatusSchema,
  detail: z.string().optional(),
});

export const ServerSyncOpSchema = SyncOpSchema.extend({
  appliedAt: z.string().min(1),
});

export const SyncResponseSchema = z.object({
  generatedAt: z.string().min(1),
  results: z.array(SyncOpResultSchema),
  serverOps: z.array(ServerSyncOpSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type SyncOpType = z.infer<typeof SyncOpTypeSchema>;
export type SyncOp = z.infer<typeof SyncOpSchema>;
export type SyncRequest = z.infer<typeof SyncRequestSchema>;
export type SyncOpResult = z.infer<typeof SyncOpResultSchema>;
export type ServerSyncOp = z.infer<typeof ServerSyncOpSchema>;
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

/** Ops the client may dequeue after a batch (accepted or already-applied). */
export function dequeueableOpIds(results: readonly SyncOpResult[]): string[] {
  return results
    .filter((r) => r.status === 'accepted' || r.status === 'duplicate')
    .map((r) => r.id);
}
