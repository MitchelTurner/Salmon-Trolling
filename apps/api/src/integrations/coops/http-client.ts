import {
  fetchWithBackoff,
  MemoryTtlCache,
  type FetchLike,
} from '../http/index.js';
import {
  parseCurrentPredictions,
  parseTidePredictions,
  parseWaterLevel,
  parseWaterTemperature,
} from './parse.js';
import { COOPS_TTL } from './ttl.js';
import type {
  CoopsClient,
  CurrentPredictionQuery,
  CurrentPredictions,
  TidePredictionQuery,
  TidePredictions,
  WaterLevelObservation,
  WaterTemperatureObservation,
} from './types.js';

export const COOPS_DATA_API =
  'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

export type HttpCoopsClientOptions = {
  fetchImpl?: FetchLike;
  cache?: MemoryTtlCache;
  now?: () => Date;
  baseUrl?: string;
};

/**
 * Live NOAA CO-OPS client. Caches predictions for 30 days and observations
 * for 10 minutes — never poll static tide tables hourly.
 */
export class HttpCoopsClient implements CoopsClient {
  private readonly fetchImpl: FetchLike;
  private readonly cache: MemoryTtlCache;
  private readonly now: () => Date;
  private readonly baseUrl: string;

  constructor(options: HttpCoopsClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cache = options.cache ?? new MemoryTtlCache();
    this.now = options.now ?? (() => new Date());
    this.baseUrl = options.baseUrl ?? COOPS_DATA_API;
  }

  async getTidePredictions(query: TidePredictionQuery): Promise<TidePredictions> {
    const key = `coops:tide:${query.stationId}:${query.beginDate}:${query.endDate}`;
    const hit = this.cache.get<TidePredictions>(key);
    if (hit) return hit;

    const url = this.buildUrl({
      station: query.stationId,
      product: 'predictions',
      datum: 'MLLW',
      begin_date: query.beginDate,
      end_date: query.endDate,
      time_zone: 'gmt',
      units: 'metric',
      interval: 'h',
      format: 'json',
    });
    const body = await this.getJson(url);
    const result = parseTidePredictions(body, {
      stationId: query.stationId,
      beginDate: query.beginDate,
      endDate: query.endDate,
      fetchedAt: this.now().toISOString(),
    });
    this.cache.set(key, result, COOPS_TTL.predictionsMs);
    return result;
  }

  async getLatestWaterLevel(stationId: string): Promise<WaterLevelObservation> {
    const key = `coops:water_level:${stationId}:latest`;
    const hit = this.cache.get<WaterLevelObservation>(key);
    if (hit) return hit;

    const url = this.buildUrl({
      station: stationId,
      product: 'water_level',
      datum: 'MLLW',
      date: 'latest',
      time_zone: 'gmt',
      units: 'metric',
      format: 'json',
    });
    const body = await this.getJson(url);
    const result = parseWaterLevel(body, {
      stationId,
      fetchedAt: this.now().toISOString(),
    });
    this.cache.set(key, result, COOPS_TTL.observationsMs);
    return result;
  }

  async getLatestWaterTemperature(
    stationId: string,
  ): Promise<WaterTemperatureObservation> {
    const key = `coops:water_temperature:${stationId}:latest`;
    const hit = this.cache.get<WaterTemperatureObservation>(key);
    if (hit) return hit;

    const url = this.buildUrl({
      station: stationId,
      product: 'water_temperature',
      date: 'latest',
      time_zone: 'gmt',
      units: 'metric',
      format: 'json',
    });
    const body = await this.getJson(url);
    const result = parseWaterTemperature(body, {
      stationId,
      fetchedAt: this.now().toISOString(),
    });
    this.cache.set(key, result, COOPS_TTL.observationsMs);
    return result;
  }

  async getCurrentPredictions(
    query: CurrentPredictionQuery,
  ): Promise<CurrentPredictions> {
    const key = `coops:currents:${query.stationId}:${query.beginDate}:${query.endDate}`;
    const hit = this.cache.get<CurrentPredictions>(key);
    if (hit) return hit;

    const url = this.buildUrl({
      station: query.stationId,
      product: 'currents_predictions',
      begin_date: query.beginDate,
      end_date: query.endDate,
      time_zone: 'gmt',
      units: 'metric',
      interval: 'MAX_SLACK',
      format: 'json',
    });
    const body = await this.getJson(url);
    const result = parseCurrentPredictions(body, {
      stationId: query.stationId,
      beginDate: query.beginDate,
      endDate: query.endDate,
      fetchedAt: this.now().toISOString(),
    });
    this.cache.set(key, result, COOPS_TTL.predictionsMs);
    return result;
  }

  private buildUrl(params: Record<string, string>): string {
    const qs = new URLSearchParams(params);
    return `${this.baseUrl}?${qs.toString()}`;
  }

  private async getJson(url: string): Promise<unknown> {
    const res = await fetchWithBackoff(url, { fetchImpl: this.fetchImpl });
    if (!res.ok) {
      throw new Error(`CO-OPS HTTP ${res.status} for ${url}`);
    }
    return res.json() as Promise<unknown>;
  }
}
