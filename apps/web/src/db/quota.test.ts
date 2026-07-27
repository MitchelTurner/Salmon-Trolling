import { describe, expect, it } from 'vitest';
import {
  QUOTA_WARN_FRACTION,
  checkStorageQuota,
  formatQuotaMessage,
} from './quota.js';

describe('checkStorageQuota', () => {
  it('warns at 80% of quota', async () => {
    const estimate = await checkStorageQuota(async () => ({
      usage: 80,
      quota: 100,
    }));
    expect(QUOTA_WARN_FRACTION).toBe(0.8);
    expect(estimate.warn).toBe(true);
    expect(estimate.fraction).toBeCloseTo(0.8);
    expect(formatQuotaMessage(estimate)).toContain('80%');
  });

  it('does not warn below the threshold', async () => {
    const estimate = await checkStorageQuota(async () => ({
      usage: 79,
      quota: 100,
    }));
    expect(estimate.warn).toBe(false);
    expect(formatQuotaMessage(estimate)).toBe('');
  });

  it('handles missing quota without warning', async () => {
    const estimate = await checkStorageQuota(async () => ({ usage: 50 }));
    expect(estimate.warn).toBe(false);
    expect(estimate.fraction).toBeNull();
  });
});
