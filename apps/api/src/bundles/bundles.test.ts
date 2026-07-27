import { describe, expect, it } from 'vitest';
import { QUEUE_NAMES } from '../queues/names.js';
import { MemoryBundleCache } from './cache.js';
import { canonicalJson } from './canonical.js';
import {
  BundleGenerator,
  decodeBundleGzip,
  processBundlesJob,
} from './generate.js';
import { FixtureBundleDataSource } from './sources.js';

describe('bundle generation', () => {
  const secret = 'test-secret';
  const startIso = '2026-07-27T00:00:00.000Z';

  it('is deterministic for the same inputs and now()', async () => {
    const source = new FixtureBundleDataSource([
      {
        key: 'bathy/ketchikan/10/1/2.geojson',
        regionId: 'ketchikan',
        z: 10,
        x: 1,
        y: 2,
      },
    ]);
    const fixedNow = () => new Date('2026-07-27T12:00:00.000Z');

    const a = new BundleGenerator(
      source,
      new MemoryBundleCache(),
      secret,
      fixedNow,
    );
    const b = new BundleGenerator(
      source,
      new MemoryBundleCache(),
      secret,
      fixedNow,
    );

    const first = await a.generate({
      regionId: 'ketchikan',
      startIso,
      windowHours: 48,
    });
    const second = await b.generate({
      regionId: 'ketchikan',
      startIso,
      windowHours: 48,
    });

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(false);
    expect(first.bundle.meta.signature).toBe(second.bundle.meta.signature);
    expect(canonicalJson(first.bundle)).toBe(canonicalJson(second.bundle));
    expect(Buffer.from(first.gzip).equals(Buffer.from(second.gzip))).toBe(true);
    expect(a.verify(first.bundle)).toBe(true);
  });

  it('serves Redis-cached gzip on the second generate (same bytes)', async () => {
    const cache = new MemoryBundleCache(
      () => Date.parse('2026-07-27T12:00:00.000Z'),
    );
    const generator = new BundleGenerator(
      new FixtureBundleDataSource(),
      cache,
      secret,
      () => new Date('2026-07-27T12:00:00.000Z'),
    );

    const first = await generator.generate({
      regionId: 'ketchikan',
      startIso,
    });
    const second = await generator.generate({
      regionId: 'ketchikan',
      startIso,
    });

    expect(second.cacheHit).toBe(true);
    expect(Buffer.from(second.gzip).equals(Buffer.from(first.gzip))).toBe(true);
    expect(decodeBundleGzip(second.gzip).meta.signature).toBe(
      first.bundle.meta.signature,
    );
  });

  it('queues under the bundles name and is safe to retry', async () => {
    const generator = new BundleGenerator(
      new FixtureBundleDataSource(),
      new MemoryBundleCache(),
      secret,
      () => new Date('2026-07-27T12:00:00.000Z'),
    );

    const job1 = await processBundlesJob(generator, {
      regionId: 'ketchikan',
      startIso,
    });
    const job2 = await processBundlesJob(generator, {
      regionId: 'ketchikan',
      startIso,
    });

    expect(QUEUE_NAMES.bundles).toBe('bundles');
    expect(job1.cacheHit).toBe(false);
    expect(job2.cacheHit).toBe(true);
    expect(job1.startIso).toBe(startIso);
  });

  it('includes sunMoon and bathyTileRefs in the dock payload', async () => {
    const generator = new BundleGenerator(
      new FixtureBundleDataSource([
        {
          key: 'bathy/ketchikan/10/1/2.geojson',
          regionId: 'ketchikan',
          z: 10,
          x: 1,
          y: 2,
        },
      ]),
      new MemoryBundleCache(),
      secret,
      () => new Date('2026-07-27T12:00:00.000Z'),
    );

    const { bundle } = await generator.generate({
      regionId: 'ketchikan',
      startIso,
    });

    expect(bundle.meta.windowHours).toBe(48);
    expect(bundle.meta.expiresAt).toBe('2026-07-29T00:00:00.000Z');
    expect(bundle.sunMoon).toBeTruthy();
    expect(bundle.bathyTileRefs).toHaveLength(1);
    expect(bundle.forecast).toMatchObject({ issuingOffice: 'PAJK' });
  });
});
