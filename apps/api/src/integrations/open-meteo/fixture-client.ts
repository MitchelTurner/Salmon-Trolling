import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOpenMeteoMarine } from './parse.js';
import type {
  OpenMeteoClient,
  OpenMeteoMarineForecast,
  OpenMeteoMarineQuery,
} from './types.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** Recorded-fixture Open-Meteo client — never hits the network. */
export class FixtureOpenMeteoClient implements OpenMeteoClient {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getMarineForecast(
    _query: OpenMeteoMarineQuery,
  ): Promise<OpenMeteoMarineForecast> {
    const body = JSON.parse(
      readFileSync(join(FIXTURES_DIR, 'marine-ketchikan.json'), 'utf8'),
    ) as unknown;
    return parseOpenMeteoMarine(body, this.now().toISOString());
  }
}
