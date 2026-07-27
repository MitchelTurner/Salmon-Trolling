import {
  fetchWithBackoff,
  MemoryTtlCache,
  type FetchLike,
} from '../http/index.js';
import { parseOpenMeteoMarine } from './parse.js';
import { OPEN_METEO_TTL } from './ttl.js';
import type {
  OpenMeteoClient,
  OpenMeteoMarineForecast,
  OpenMeteoMarineQuery,
} from './types.js';

export const OPEN_METEO_MARINE_API =
  'https://marine-api.open-meteo.com/v1/marine';

const HOURLY_VARS = [
  'wave_height',
  'wave_direction',
  'wave_period',
  'swell_wave_height',
  'swell_wave_direction',
  'swell_wave_period',
  'sea_surface_temperature',
].join(',');

export type HttpOpenMeteoClientOptions = {
  fetchImpl?: FetchLike;
  cache?: MemoryTtlCache;
  now?: () => Date;
  baseUrl?: string;
};

/** Live Open-Meteo Marine client. Caches 3 hours. */
export class HttpOpenMeteoClient implements OpenMeteoClient {
  private readonly fetchImpl: FetchLike;
  private readonly cache: MemoryTtlCache;
  private readonly now: () => Date;
  private readonly baseUrl: string;

  constructor(options: HttpOpenMeteoClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cache = options.cache ?? new MemoryTtlCache();
    this.now = options.now ?? (() => new Date());
    this.baseUrl = options.baseUrl ?? OPEN_METEO_MARINE_API;
  }

  async getMarineForecast(
    query: OpenMeteoMarineQuery,
  ): Promise<OpenMeteoMarineForecast> {
    const hours = query.forecastHours ?? 48;
    const key = `open-meteo:marine:${query.lat}:${query.lon}:${hours}`;
    const hit = this.cache.get<OpenMeteoMarineForecast>(key);
    if (hit) return hit;

    const qs = new URLSearchParams({
      latitude: String(query.lat),
      longitude: String(query.lon),
      hourly: HOURLY_VARS,
      forecast_hours: String(hours),
      timezone: 'UTC',
    });
    const url = `${this.baseUrl}?${qs.toString()}`;
    const res = await fetchWithBackoff(url, { fetchImpl: this.fetchImpl });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status} for ${url}`);
    }
    const body = (await res.json()) as unknown;
    const result = parseOpenMeteoMarine(body, this.now().toISOString());
    this.cache.set(key, result, OPEN_METEO_TTL.marineMs);
    return result;
  }
}
