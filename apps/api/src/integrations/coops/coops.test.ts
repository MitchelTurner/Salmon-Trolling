import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegion } from '@troll/shared';
import { describe, expect, it, vi } from 'vitest';
import { INTEGRATION_USER_AGENT, MemoryTtlCache } from '../http/index.js';
import { FixtureCoopsClient } from './fixture-client.js';
import { HttpCoopsClient } from './http-client.js';
import { COOPS_TTL } from './ttl.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const region = getRegion('ketchikan');

function fixtureJson(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as unknown;
}

describe('CO-OPS TTLs', () => {
  it('matches docs/04-data-sources.md', () => {
    expect(COOPS_TTL.predictionsMs).toBe(30 * 24 * 60 * 60 * 1000);
    expect(COOPS_TTL.observationsMs).toBe(10 * 60 * 1000);
  });
});

describe('FixtureCoopsClient', () => {
  const fixedNow = () => new Date('2026-07-27T12:00:00.000Z');
  const client = new FixtureCoopsClient(fixedNow);

  it('parses recorded tide predictions for Ketchikan 9450460', async () => {
    const result = await client.getTidePredictions({
      stationId: region.stations.coopsTide,
      beginDate: '20260727',
      endDate: '20260728',
    });

    expect(result.stationId).toBe('9450460');
    expect(result.fetchedAt).toBe('2026-07-27T12:00:00.000Z');
    expect(result.cacheTtlMs).toBe(COOPS_TTL.predictionsMs);
    expect(result.predictions.length).toBeGreaterThan(20);
    expect(result.predictions[0]).toEqual({
      t: '2026-07-27T00:00:00.000Z',
      heightM: 2.088,
    });
  });

  it('parses recorded water level and temperature observations', async () => {
    const level = await client.getLatestWaterLevel(region.stations.coopsTide);
    expect(level.stationName).toBe('Ketchikan');
    expect(level.heightM).toBeCloseTo(1.759);
    expect(level.cacheTtlMs).toBe(COOPS_TTL.observationsMs);

    const temp = await client.getLatestWaterTemperature(
      region.stations.coopsTide,
    );
    expect(temp.tempC).toBeCloseTo(13.6);
    expect(temp.cacheTtlMs).toBe(COOPS_TTL.observationsMs);
  });

  it('parses recorded Narrows current predictions', async () => {
    const result = await client.getCurrentPredictions({
      stationId: region.stations.coopsCurrent,
      beginDate: '20260727',
      endDate: '20260727',
    });

    expect(result.stationId).toBe('PCT2786');
    expect(result.cacheTtlMs).toBe(COOPS_TTL.predictionsMs);
    expect(result.predictions.some((p) => p.type === 'flood')).toBe(true);
    expect(result.predictions[1]?.velocityMajorCms).toBeCloseTo(36.7);
  });
});

describe('HttpCoopsClient', () => {
  it('sets User-Agent and caches predictions so static tables are not re-polled', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify(
          fixtureJson(`tide-predictions-${region.stations.coopsTide}.json`),
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = new HttpCoopsClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cache: new MemoryTtlCache(() => Date.parse('2026-07-27T12:00:00.000Z')),
      now: () => new Date('2026-07-27T12:00:00.000Z'),
    });

    const query = {
      stationId: region.stations.coopsTide,
      beginDate: '20260727',
      endDate: '20260728',
    };

    const first = await client.getTidePredictions(query);
    const second = await client.getTidePredictions(query);

    expect(first.predictions).toEqual(second.predictions);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('User-Agent')).toBe(INTEGRATION_USER_AGENT);
  });

  it('uses the short observation TTL cache key for water level', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify(
          fixtureJson(`water-level-${region.stations.coopsTide}.json`),
        ),
        { status: 200 },
      ),
    );

    const client = new HttpCoopsClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => new Date('2026-07-27T12:00:00.000Z'),
    });

    await client.getLatestWaterLevel(region.stations.coopsTide);
    await client.getLatestWaterLevel(region.stations.coopsTide);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
