import { gzipSync, gunzipSync } from 'node:zlib';
import {
  alignBundleWindowStart,
  bundleCacheKey,
  bundleExpiresAt,
  BUNDLE_DEFAULT_WINDOW_HOURS,
  BUNDLE_SCHEMA_VERSION,
  type ConditionsBundle,
  type RegionId,
} from '@troll/shared';
import type { BundleCache } from './cache.js';
import { canonicalJson } from './canonical.js';
import { signBundle, verifyBundleSignature } from './sign.js';
import type { BundleDataSource } from './sources.js';
import { QUEUE_NAMES } from '../queues/names.js';

export type GenerateBundleInput = {
  regionId: RegionId;
  /** Wall clock used to align the dock window when startIso omitted. */
  at?: Date;
  startIso?: string;
  windowHours?: number;
};

export const BUNDLE_SIGNING_SECRET_ENV = 'BUNDLE_SIGNING_SECRET';

export function resolveBundleSigningSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env[BUNDLE_SIGNING_SECRET_ENV] ?? 'dev-bundle-signing-secret';
}

/**
 * Bundles queue job: build a signed, gzipped dock bundle and cache it.
 * Idempotent — cache hit returns the same bytes (deterministic for inputs).
 */
export class BundleGenerator {
  constructor(
    private readonly source: BundleDataSource,
    private readonly cache: BundleCache,
    private readonly secret: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async generate(input: GenerateBundleInput): Promise<{
    bundle: ConditionsBundle;
    gzip: Uint8Array;
    cacheHit: boolean;
    queue: typeof QUEUE_NAMES.bundles;
  }> {
    const windowHours = input.windowHours ?? BUNDLE_DEFAULT_WINDOW_HOURS;
    const startIso =
      input.startIso ?? alignBundleWindowStart(input.at ?? this.now());
    const expiresAt = bundleExpiresAt(startIso, windowHours);
    const cacheKey = bundleCacheKey(input.regionId, startIso, windowHours);

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      const bundle = decodeBundleGzip(cached);
      return {
        bundle,
        gzip: cached,
        cacheHit: true,
        queue: QUEUE_NAMES.bundles,
      };
    }

    const body = await this.source.load({
      regionId: input.regionId,
      startIso,
      expiresAt,
    });

    const generatedAt = this.now().toISOString();
    const signable = {
      regionId: input.regionId,
      startIso,
      expiresAt,
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      windowHours,
      tides: body.tides,
      currents: body.currents,
      forecast: body.forecast,
      regs: body.regs,
      sunMoon: body.sunMoon,
      bathyTileRefs: body.bathyTileRefs,
    };
    const signature = signBundle(signable, this.secret);

    const bundle: ConditionsBundle = {
      ...body,
      meta: {
        regionId: input.regionId,
        startIso,
        expiresAt,
        generatedAt,
        schemaVersion: BUNDLE_SCHEMA_VERSION,
        windowHours,
        signature,
      },
    };

    const gzip = gzipSync(Buffer.from(canonicalJson(bundle), 'utf8'));
    const ttlSeconds = Math.max(
      60,
      Math.floor((Date.parse(expiresAt) - this.now().getTime()) / 1000),
    );
    await this.cache.set(cacheKey, gzip, ttlSeconds);

    return {
      bundle,
      gzip: new Uint8Array(gzip),
      cacheHit: false,
      queue: QUEUE_NAMES.bundles,
    };
  }

  verify(bundle: ConditionsBundle): boolean {
    return verifyBundleSignature(
      {
        regionId: bundle.meta.regionId,
        startIso: bundle.meta.startIso,
        expiresAt: bundle.meta.expiresAt,
        schemaVersion: bundle.meta.schemaVersion,
        windowHours: bundle.meta.windowHours,
        tides: bundle.tides,
        currents: bundle.currents,
        forecast: bundle.forecast,
        regs: bundle.regs,
        sunMoon: bundle.sunMoon,
        bathyTileRefs: bundle.bathyTileRefs,
      },
      bundle.meta.signature,
      this.secret,
    );
  }
}

export function decodeBundleGzip(bytes: Uint8Array): ConditionsBundle {
  const json = gunzipSync(Buffer.from(bytes)).toString('utf8');
  return JSON.parse(json) as ConditionsBundle;
}

/** BullMQ-shaped processor entry for the `bundles` queue. */
export async function processBundlesJob(
  generator: BundleGenerator,
  data: GenerateBundleInput,
): Promise<{ regionId: RegionId; startIso: string; cacheHit: boolean }> {
  const result = await generator.generate(data);
  return {
    regionId: result.bundle.meta.regionId,
    startIso: result.bundle.meta.startIso,
    cacheHit: result.cacheHit,
  };
}
