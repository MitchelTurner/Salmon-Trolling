/**
 * BullMQ queue name constants (docs/10-backend.mdc).
 * Every job is idempotent and safe to retry.
 */
export const QUEUE_NAMES = {
  bundles: 'bundles',
  ingest: 'ingest',
  calibration: 'calibration',
  notify: 'notify',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
