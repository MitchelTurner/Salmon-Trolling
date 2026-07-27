import type { BundleRecord } from '../db/types.js';

/** Prompt refresh when the dock bundle is older than this. */
export const BUNDLE_REFRESH_PROMPT_AFTER_MS = 24 * 60 * 60 * 1000;

export function bundleAgeMs(
  generatedAt: string,
  nowMs: number = Date.now(),
): number {
  return Math.max(0, nowMs - Date.parse(generatedAt));
}

/**
 * Human age for the prominent dock readout.
 * Examples: "just now", "3 hours ago", "3 days ago".
 */
export function formatBundleAge(
  generatedAt: string,
  nowMs: number = Date.now(),
): string {
  const age = bundleAgeMs(generatedAt, nowMs);
  const minutes = Math.floor(age / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export type BundleFreshness = {
  readonly hasBundle: boolean;
  readonly ageLabel: string | null;
  readonly expired: boolean;
  readonly promptRefresh: boolean;
  readonly promptMessage: string;
};

/**
 * Dock prefetch prompt logic.
 * "last updated 3 days ago, tap to refresh before you leave."
 */
export function bundleFreshness(
  bundle: BundleRecord | null | undefined,
  nowMs: number = Date.now(),
): BundleFreshness {
  if (!bundle) {
    return {
      hasBundle: false,
      ageLabel: null,
      expired: false,
      promptRefresh: true,
      promptMessage:
        'No dock bundle yet — tap to refresh before you leave.',
    };
  }

  const expired = Date.parse(bundle.expiresAt) <= nowMs;
  const age = bundleAgeMs(bundle.generatedAt, nowMs);
  const ageLabel = formatBundleAge(bundle.generatedAt, nowMs);
  const stale = age >= BUNDLE_REFRESH_PROMPT_AFTER_MS;
  const promptRefresh = expired || stale;

  const promptMessage = expired
    ? `Bundle expired — last updated ${ageLabel}. Tap to refresh before you leave.`
    : promptRefresh
      ? `Last updated ${ageLabel} — tap to refresh before you leave.`
      : `Last updated ${ageLabel}.`;

  return {
    hasBundle: true,
    ageLabel,
    expired,
    promptRefresh,
    promptMessage,
  };
}
