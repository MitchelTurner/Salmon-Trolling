import {
  fetchWithBackoff,
  MemoryTtlCache,
  type FetchLike,
} from '../http/index.js';
import { parseStationObservations } from './parse.js';
import { NDBC_TTL } from './ttl.js';
import type { NdbcClient, NdbcStationObservations } from './types.js';

export const NDBC_REALTIME_BASE =
  'https://www.ndbc.noaa.gov/data/realtime2';

export type HttpNdbcClientOptions = {
  fetchImpl?: FetchLike;
  cache?: MemoryTtlCache;
  now?: () => Date;
  baseUrl?: string;
};

/**
 * Live NDBC realtime2 client. Caches 30 minutes.
 * Gaps are reported, never filled.
 */
export class HttpNdbcClient implements NdbcClient {
  private readonly fetchImpl: FetchLike;
  private readonly cache: MemoryTtlCache;
  private readonly now: () => Date;
  private readonly baseUrl: string;

  constructor(options: HttpNdbcClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cache = options.cache ?? new MemoryTtlCache();
    this.now = options.now ?? (() => new Date());
    this.baseUrl = options.baseUrl ?? NDBC_REALTIME_BASE;
  }

  async getLatestObservations(
    stationId: string,
    options?: { limit?: number },
  ): Promise<NdbcStationObservations> {
    const key = `ndbc:realtime:${stationId.toUpperCase()}:${options?.limit ?? 'all'}`;
    const hit = this.cache.get<NdbcStationObservations>(key);
    if (hit) return hit;

    const url = `${this.baseUrl}/${encodeURIComponent(stationId.toUpperCase())}.txt`;
    const res = await fetchWithBackoff(url, { fetchImpl: this.fetchImpl });
    if (!res.ok) {
      throw new Error(`NDBC HTTP ${res.status} for ${url}`);
    }
    const text = await res.text();
    const result = parseStationObservations(text, {
      stationId: stationId.toUpperCase(),
      fetchedAt: this.now().toISOString(),
      limit: options?.limit,
    });
    this.cache.set(key, result, NDBC_TTL.observationsMs);
    return result;
  }
}
