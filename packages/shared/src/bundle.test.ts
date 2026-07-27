import { describe, expect, it } from 'vitest';
import {
  alignBundleWindowStart,
  bundleCacheKey,
  bundleExpiresAt,
  bundleObjectName,
  BUNDLE_DEFAULT_WINDOW_HOURS,
  BUNDLE_SCHEMA_VERSION,
} from './bundle.js';

describe('bundle window helpers', () => {
  it('aligns start to UTC midnight', () => {
    expect(alignBundleWindowStart(new Date('2026-07-27T15:42:00.000Z'))).toBe(
      '2026-07-27T00:00:00.000Z',
    );
  });

  it('computes 48h expiry and stable cache/object names', () => {
    const start = '2026-07-27T00:00:00.000Z';
    expect(bundleExpiresAt(start, BUNDLE_DEFAULT_WINDOW_HOURS)).toBe(
      '2026-07-29T00:00:00.000Z',
    );
    expect(bundleCacheKey('ketchikan', start, 48)).toBe(
      'bundle:ketchikan:2026-07-27T00:00:00.000Z:48',
    );
    expect(bundleObjectName('ketchikan', start)).toBe(
      'bundle-ketchikan-2026-07-27T00-00-00-000Z.json.gz',
    );
    expect(BUNDLE_SCHEMA_VERSION).toBe(1);
  });
});
