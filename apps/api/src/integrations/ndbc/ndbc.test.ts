import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegion } from '@troll/shared';
import { describe, expect, it, vi } from 'vitest';
import { INTEGRATION_USER_AGENT, MemoryTtlCache } from '../http/index.js';
import { FixtureNdbcClient } from './fixture-client.js';
import { HttpNdbcClient } from './http-client.js';
import { detectGaps, parseRealtimeText } from './parse.js';
import { NDBC_TTL } from './ttl.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const region = getRegion('ketchikan');

describe('NDBC TTLs', () => {
  it('matches docs/04-data-sources.md (30 min)', () => {
    expect(NDBC_TTL.observationsMs).toBe(30 * 60 * 1000);
  });
});

describe('NDBC parse + gaps', () => {
  it('parses buoy rows and reports gaps without interpolating', () => {
    const text = readFileSync(
      join(fixturesDir, '46145-realtime.txt'),
      'utf8',
    );
    const observations = parseRealtimeText(text);
    expect(observations.length).toBeGreaterThan(5);
    expect(observations[0]?.waveHeightM).toBeTypeOf('number');

    const gaps = detectGaps(observations);
    expect(gaps.length).toBeGreaterThan(0);
    // Fixture includes a missing 11:00 UTC hour (10:00 → 12:00).
    expect(
      gaps.some(
        (g) =>
          g.after === '2026-07-26T10:00:00.000Z' &&
          g.before === '2026-07-26T12:00:00.000Z',
      ),
    ).toBe(true);

    // Never invent a sample inside the gap.
    expect(
      observations.some((o) => o.t === '2026-07-26T11:00:00.000Z'),
    ).toBe(false);
  });

  it('leaves MM fields undefined rather than fabricating values', () => {
    const text = readFileSync(
      join(fixturesDir, 'gixa2-realtime.txt'),
      'utf8',
    );
    const observations = parseRealtimeText(text);
    const latest = observations[observations.length - 1]!;
    expect(latest.waveHeightM).toBeUndefined();
    expect(latest.waterTempC).toBeUndefined();
    expect(latest.windSpeedMs).toBeTypeOf('number');
  });
});

describe('FixtureNdbcClient', () => {
  it('returns Dixon Entrance buoy observations for the region station', async () => {
    const client = new FixtureNdbcClient(
      () => new Date('2026-07-27T12:00:00.000Z'),
    );
    const result = await client.getLatestObservations(region.stations.ndbcBuoy);

    expect(result.stationId).toBe('46145');
    expect(result.cacheTtlMs).toBe(NDBC_TTL.observationsMs);
    expect(result.observations.length).toBeGreaterThan(10);
    expect(result.gaps.length).toBeGreaterThan(0);
  });
});

describe('HttpNdbcClient', () => {
  it('caches observations and sets User-Agent', async () => {
    const text = readFileSync(
      join(fixturesDir, '46145-realtime.txt'),
      'utf8',
    );
    const fetchImpl = vi.fn(
      async () => new Response(text, { status: 200 }),
    );

    const client = new HttpNdbcClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cache: new MemoryTtlCache(() => Date.parse('2026-07-27T12:00:00.000Z')),
      now: () => new Date('2026-07-27T12:00:00.000Z'),
    });

    await client.getLatestObservations('46145', { limit: 5 });
    await client.getLatestObservations('46145', { limit: 5 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const headers = new Headers(
      (fetchImpl.mock.calls[0]?.[1] as RequestInit).headers,
    );
    expect(headers.get('User-Agent')).toBe(INTEGRATION_USER_AGENT);
  });
});
