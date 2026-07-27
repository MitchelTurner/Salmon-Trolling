import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarineZoneForecast, type NwsProductBody } from './parse.js';
import type {
  MarineForecastQuery,
  MarineZoneForecast,
  NwsClient,
} from './types.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8')) as unknown;
}

/** Recorded-fixture NWS client — never hits the network. */
export class FixtureNwsClient implements NwsClient {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getMarineZoneForecast(
    query: MarineForecastQuery,
  ): Promise<MarineZoneForecast> {
    const product = loadFixture(
      `cwf-${query.cwfLocation.toLowerCase()}-latest.json`,
    ) as NwsProductBody;
    return parseMarineZoneForecast(
      product,
      query.zoneId,
      this.now().toISOString(),
    );
  }
}
