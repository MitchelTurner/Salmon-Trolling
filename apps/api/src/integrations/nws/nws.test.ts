import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegion } from '@troll/shared';
import { describe, expect, it, vi } from 'vitest';
import { INTEGRATION_USER_AGENT, MemoryTtlCache } from '../http/index.js';
import { FixtureNwsClient } from './fixture-client.js';
import { HttpNwsClient } from './http-client.js';
import { NWS_TTL } from './ttl.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const region = getRegion('ketchikan');

function fixtureJson(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as unknown;
}

describe('NWS TTLs', () => {
  it('matches docs/04-data-sources.md (1 h)', () => {
    expect(NWS_TTL.marineForecastMs).toBe(60 * 60 * 1000);
  });
});

describe('FixtureNwsClient', () => {
  it('returns zone forecast with issuing office and issue time', async () => {
    const client = new FixtureNwsClient(
      () => new Date('2026-07-27T12:00:00.000Z'),
    );
    const result = await client.getMarineZoneForecast({
      zoneId: region.stations.nwsMarineZone,
      cwfLocation: region.stations.nwsCwfLocation,
    });

    expect(result.zoneId).toBe('PKZ036');
    expect(result.zoneName).toMatch(/Clarence Strait/i);
    expect(result.issuingOffice).toBe('PAJK');
    expect(result.issueTime).toBe('2026-07-27T00:09:00.000Z');
    expect(result.fetchedAt).toBe('2026-07-27T12:00:00.000Z');
    expect(result.cacheTtlMs).toBe(NWS_TTL.marineForecastMs);
    expect(result.periods.length).toBeGreaterThan(3);
    expect(result.periods[0]?.name).toMatch(/TONIGHT/i);
    expect(result.rawText).toContain('PKZ036');
  });
});

describe('HttpNwsClient', () => {
  it('fetches CWF list + product, caches 1h, sets User-Agent', async () => {
    const list = fixtureJson('cwf-ajk-list.json');
    const product = fixtureJson('cwf-ajk-latest.json');
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/products/types/CWF/')) {
        return new Response(JSON.stringify(list), { status: 200 });
      }
      return new Response(JSON.stringify(product), { status: 200 });
    });

    const client = new HttpNwsClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cache: new MemoryTtlCache(() => Date.parse('2026-07-27T12:00:00.000Z')),
      now: () => new Date('2026-07-27T12:00:00.000Z'),
    });

    const query = {
      zoneId: region.stations.nwsMarineZone,
      cwfLocation: region.stations.nwsCwfLocation,
    };
    const first = await client.getMarineZoneForecast(query);
    const second = await client.getMarineZoneForecast(query);

    expect(first.issuingOffice).toBe('PAJK');
    expect(first.issueTime).toBeTruthy();
    expect(second.productId).toBe(first.productId);
    // list + product once; second call served from cache
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const headers = new Headers(
      (fetchImpl.mock.calls[0]?.[1] as RequestInit).headers,
    );
    expect(headers.get('User-Agent')).toBe(INTEGRATION_USER_AGENT);
  });
});
