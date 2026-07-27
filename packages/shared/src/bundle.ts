import { z } from 'zod';
import { type BathyTileRef } from './bathy.js';
import { REGION_IDS, type RegionId } from './regions.js';

export const BUNDLE_SCHEMA_VERSION = 1 as const;
export const BUNDLE_DEFAULT_WINDOW_HOURS = 48 as const;

export const BundleMetaSchema = z.object({
  regionId: z.enum(REGION_IDS),
  startIso: z.string().datetime(),
  expiresAt: z.string().datetime(),
  generatedAt: z.string().datetime(),
  schemaVersion: z.literal(BUNDLE_SCHEMA_VERSION),
  windowHours: z.number().int().positive(),
  signature: z.string().min(1),
});

export type BundleMeta = z.infer<typeof BundleMetaSchema>;

/** Unsigned payload body — signature covers this + meta fields except generatedAt/signature. */
export type BundlePayloadBody = {
  readonly tides: readonly unknown[];
  readonly currents: readonly unknown[];
  readonly forecast: unknown;
  readonly regs: unknown;
  readonly sunMoon: unknown;
  readonly bathyTileRefs: readonly BathyTileRef[];
};

export type ConditionsBundle = BundlePayloadBody & {
  readonly meta: BundleMeta;
};

/** Align dock-window start to UTC midnight for stable cache keys. */
export function alignBundleWindowStart(date: Date): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  ).toISOString();
}

export function bundleExpiresAt(
  startIso: string,
  windowHours: number,
): string {
  return new Date(
    Date.parse(startIso) + windowHours * 60 * 60 * 1000,
  ).toISOString();
}

export function bundleCacheKey(
  regionId: RegionId,
  startIso: string,
  windowHours: number,
): string {
  return `bundle:${regionId}:${startIso}:${windowHours}`;
}

export function bundleObjectName(
  regionId: RegionId,
  startIso: string,
): string {
  // startIso is already an ISO string; keep filename filesystem-safe.
  const safeStart = startIso.replace(/[:.]/g, '-');
  return `bundle-${regionId}-${safeStart}.json.gz`;
}
