/** Warn when IndexedDB usage crosses 80% of the origin quota. */

export const QUOTA_WARN_FRACTION = 0.8;

export type StorageQuotaEstimate = {
  readonly usage: number;
  readonly quota: number;
  /** usage / quota when both known; otherwise null. */
  readonly fraction: number | null;
  readonly warn: boolean;
};

export type StorageEstimateFn = () => Promise<{
  usage?: number;
  quota?: number;
}>;

/**
 * Read origin storage usage. Inject {@link estimateFn} in tests —
 * `navigator.storage` is unavailable or stubbed under jsdom.
 */
export async function checkStorageQuota(
  estimateFn?: StorageEstimateFn,
): Promise<StorageQuotaEstimate> {
  const estimate =
    estimateFn ??
    (typeof navigator !== 'undefined' && navigator.storage?.estimate
      ? () => navigator.storage.estimate()
      : undefined);

  if (!estimate) {
    return { usage: 0, quota: 0, fraction: null, warn: false };
  }

  const { usage = 0, quota = 0 } = await estimate();
  if (quota <= 0) {
    return { usage, quota, fraction: null, warn: false };
  }

  const fraction = usage / quota;
  return {
    usage,
    quota,
    fraction,
    warn: fraction >= QUOTA_WARN_FRACTION,
  };
}

export function formatQuotaMessage(estimate: StorageQuotaEstimate): string {
  if (!estimate.warn || estimate.fraction === null) {
    return '';
  }
  const pct = Math.round(estimate.fraction * 100);
  return `Storage ${pct}% full — archive and purge old trips before they fill the phone.`;
}
