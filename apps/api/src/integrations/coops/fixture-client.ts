import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseCurrentPredictions,
  parseTidePredictions,
  parseWaterLevel,
  parseWaterTemperature,
} from './parse.js';
import type {
  CoopsClient,
  CurrentPredictionQuery,
  CurrentPredictions,
  TidePredictionQuery,
  TidePredictions,
  WaterLevelObservation,
  WaterTemperatureObservation,
} from './types.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function loadFixture(name: string): unknown {
  const path = join(FIXTURES_DIR, name);
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/**
 * Recorded-fixture CO-OPS client for tests — never hits the network.
 */
export class FixtureCoopsClient implements CoopsClient {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getTidePredictions(query: TidePredictionQuery): Promise<TidePredictions> {
    const body = loadFixture(`tide-predictions-${query.stationId}.json`);
    return parseTidePredictions(body, {
      stationId: query.stationId,
      beginDate: query.beginDate,
      endDate: query.endDate,
      fetchedAt: this.now().toISOString(),
    });
  }

  async getLatestWaterLevel(stationId: string): Promise<WaterLevelObservation> {
    const body = loadFixture(`water-level-${stationId}.json`);
    return parseWaterLevel(body, {
      stationId,
      fetchedAt: this.now().toISOString(),
    });
  }

  async getLatestWaterTemperature(
    stationId: string,
  ): Promise<WaterTemperatureObservation> {
    const body = loadFixture(`water-temperature-${stationId}.json`);
    return parseWaterTemperature(body, {
      stationId,
      fetchedAt: this.now().toISOString(),
    });
  }

  async getCurrentPredictions(
    query: CurrentPredictionQuery,
  ): Promise<CurrentPredictions> {
    const body = loadFixture(`currents-predictions-${query.stationId}.json`);
    return parseCurrentPredictions(body, {
      stationId: query.stationId,
      beginDate: query.beginDate,
      endDate: query.endDate,
      fetchedAt: this.now().toISOString(),
    });
  }
}
