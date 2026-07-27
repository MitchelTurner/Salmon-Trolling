import { describe, expect, it } from 'vitest';
import type { BundleRecord } from '../db/types.js';
import {
  bundleFreshness,
  formatBundleAge,
} from './age.js';

const baseBundle: BundleRecord = {
  id: 'b1',
  regionId: 'ketchikan',
  startIso: '2026-07-24T00:00:00.000Z',
  expiresAt: '2026-07-29T00:00:00.000Z',
  generatedAt: '2026-07-24T12:00:00.000Z',
  schemaVersion: 1,
  signature: 'sig',
  payload: {},
};

describe('formatBundleAge', () => {
  it('formats hours and days for the dock readout', () => {
    const now = Date.parse('2026-07-27T12:00:00.000Z');
    expect(formatBundleAge('2026-07-27T11:00:00.000Z', now)).toBe(
      '1 hour ago',
    );
    expect(formatBundleAge('2026-07-24T12:00:00.000Z', now)).toBe(
      '3 days ago',
    );
  });
});

describe('bundleFreshness', () => {
  it('prompts refresh when there is no local bundle', () => {
    const f = bundleFreshness(null);
    expect(f.promptRefresh).toBe(true);
    expect(f.promptMessage).toMatch(/no dock bundle/i);
  });

  it('prompts with age when the bundle is days old', () => {
    const now = Date.parse('2026-07-27T12:00:00.000Z');
    const f = bundleFreshness(baseBundle, now);
    expect(f.ageLabel).toBe('3 days ago');
    expect(f.promptRefresh).toBe(true);
    expect(f.promptMessage).toBe(
      'Last updated 3 days ago — tap to refresh before you leave.',
    );
  });

  it('does not prompt when the bundle is fresh', () => {
    const now = Date.parse('2026-07-27T12:00:00.000Z');
    const f = bundleFreshness(
      {
        ...baseBundle,
        generatedAt: '2026-07-27T10:00:00.000Z',
        expiresAt: '2026-07-29T00:00:00.000Z',
      },
      now,
    );
    expect(f.promptRefresh).toBe(false);
    expect(f.promptMessage).toBe('Last updated 2 hours ago.');
  });
});
