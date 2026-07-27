import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStationObservations } from './parse.js';
import type { NdbcClient, NdbcStationObservations } from './types.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** Recorded-fixture NDBC client — never hits the network. */
export class FixtureNdbcClient implements NdbcClient {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getLatestObservations(
    stationId: string,
    options?: { limit?: number },
  ): Promise<NdbcStationObservations> {
    const path = join(
      FIXTURES_DIR,
      `${stationId.toLowerCase()}-realtime.txt`,
    );
    const text = readFileSync(path, 'utf8');
    return parseStationObservations(text, {
      stationId: stationId.toUpperCase(),
      fetchedAt: this.now().toISOString(),
      limit: options?.limit,
    });
  }
}
