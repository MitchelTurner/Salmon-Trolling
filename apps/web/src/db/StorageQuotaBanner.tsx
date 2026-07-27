import { useEffect, useState } from 'react';
import {
  checkStorageQuota,
  formatQuotaMessage,
  type StorageQuotaEstimate,
} from './quota.js';

type Props = {
  /** How often to re-check, ms. Default 60s. */
  pollMs?: number;
  estimateFn?: Parameters<typeof checkStorageQuota>[0];
};

/**
 * Persistent, non-modal quota warning at ≥80% usage.
 * Offline sync doc: warn and offer per-trip archive-and-purge (purge UI later).
 */
export function StorageQuotaBanner({ pollMs = 60_000, estimateFn }: Props) {
  const [estimate, setEstimate] = useState<StorageQuotaEstimate | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const next = await checkStorageQuota(estimateFn);
      if (!cancelled) setEstimate(next);
    };

    void tick();
    const id = window.setInterval(() => void tick(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [estimateFn, pollMs]);

  if (!estimate?.warn) return null;

  const message = formatQuotaMessage(estimate);
  if (!message) return null;

  return (
    <div
      role="status"
      className="border-b border-caution bg-land px-4 py-3 font-ui text-sm text-hairline"
      data-testid="storage-quota-banner"
    >
      {message}
    </div>
  );
}
