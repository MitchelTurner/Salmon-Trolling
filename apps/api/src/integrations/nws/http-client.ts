import {
  fetchWithBackoff,
  MemoryTtlCache,
  type FetchLike,
} from '../http/index.js';
import {
  parseMarineZoneForecast,
  parseProductList,
  type NwsProductBody,
} from './parse.js';
import { NWS_TTL } from './ttl.js';
import type {
  MarineForecastQuery,
  MarineZoneForecast,
  NwsClient,
} from './types.js';

export const NWS_API_BASE = 'https://api.weather.gov';

export type HttpNwsClientOptions = {
  fetchImpl?: FetchLike;
  cache?: MemoryTtlCache;
  now?: () => Date;
  baseUrl?: string;
};

/**
 * Live NWS client for zone-based marine Coastal Waters Forecasts.
 * Always carries issuing office + issue time for UI display.
 */
export class HttpNwsClient implements NwsClient {
  private readonly fetchImpl: FetchLike;
  private readonly cache: MemoryTtlCache;
  private readonly now: () => Date;
  private readonly baseUrl: string;

  constructor(options: HttpNwsClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cache = options.cache ?? new MemoryTtlCache();
    this.now = options.now ?? (() => new Date());
    this.baseUrl = options.baseUrl ?? NWS_API_BASE;
  }

  async getMarineZoneForecast(
    query: MarineForecastQuery,
  ): Promise<MarineZoneForecast> {
    const key = `nws:cwf:${query.cwfLocation}:${query.zoneId}`;
    const hit = this.cache.get<MarineZoneForecast>(key);
    if (hit) return hit;

    const listUrl = `${this.baseUrl}/products/types/CWF/locations/${encodeURIComponent(query.cwfLocation)}`;
    const listBody = await this.getJson(listUrl);
    const latest = parseProductList(listBody)[0]!;
    const productUrl = `${this.baseUrl}/products/${encodeURIComponent(latest.id)}`;
    const product = (await this.getJson(productUrl)) as NwsProductBody;

    const result = parseMarineZoneForecast(
      product,
      query.zoneId,
      this.now().toISOString(),
    );
    this.cache.set(key, result, NWS_TTL.marineForecastMs);
    return result;
  }

  private async getJson(url: string): Promise<unknown> {
    const res = await fetchWithBackoff(url, {
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) {
      throw new Error(`NWS HTTP ${res.status} for ${url}`);
    }
    return res.json() as Promise<unknown>;
  }
}
