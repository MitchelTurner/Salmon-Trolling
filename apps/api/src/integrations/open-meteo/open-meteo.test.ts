import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegion } from '@troll/shared';
import { describe, expect, it, vi } from 'vitest';
import { INTEGRATION_USER_AGENT, MemoryTtlCache } from '../http/index.js';
import { FixtureOpenMeteoClient } from './fixture-client.js';
import { HttpOpenMeteoClient } from './http-client.js';
import { OPEN_METEO_TTL } from './ttl.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const region = getRegion('ketchikan');

describe('Open-Meteo TTLs', () => {
  it('matches docs/04-data-sources.md (3 h)', () => {
    expect(OPEN_METEO_TTL.marineMs).toBe(3 * 60 * 60 * 1000);
  });
});

describe('FixtureOpenMeteoClient', () => {
  it('parses waves, swell, and SST for the Ketchikan marine point', async () => {
    const client = new FixtureOpenMeteoClient(
      () => new Date('2026-07-27T12:00:00.000Z'),
    );
    const result = await client.getMarineForecast({
      lat: region.marinePoint.lat,
      lon: region.marinePoint.lon,
    });

    expect(result.cacheTtlMs).toBe(OPEN_METEO_TTL.marineMs);
    expect(result.hourly.length).toBe(48);
    expect(result.hourly[0]?.t).toBe('2026-07-27T02:00:00.000Z');
    expect(result.hourly[0]?.waveHeightM).toBeCloseTo(0.3);
    expect(result.hourly[0]?.seaSurfaceTempC).toBeCloseTo(15.8);
    expect(result.hourly[0]?.swellHeightM).toBeTypeOf('number');
  });
});

describe('HttpOpenMeteoClient', () => {
  it('caches marine forecasts and sets User-Agent', async () => {
    const body = readFileSync(
      join(fixturesDir, 'marine-ketchikan.json'),
      'utf8',
    );
    const fetchImpl = vi.fn(
      async () =>
        new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const client = new HttpOpenMeteoClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cache: new MemoryTtlCache(() => Date.parse('2026-07-27T12:00:00.000Z')),
      now: () => new Date('2026-07-27T12:00:00.000Z'),
    });

    const query = {
      lat: region.marinePoint.lat,
      lon: region.marinePoint.lon,
      forecastHours: 48,
    };
    await client.getMarineForecast(query);
    await client.getMarineForecast(query);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const headers = new Headers(
      (fetchImpl.mock.calls[0]?.[1] as RequestInit).headers,
    );
    expect(headers.get('User-Agent')).toBe(INTEGRATION_USER_AGENT);
  });
});
