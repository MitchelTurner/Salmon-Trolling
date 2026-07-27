import {
  fetchWithBackoff,
  MemoryTtlCache,
  type FetchLike,
} from '../http/index.js';
import { parseEonrDetailHtml, parseEonrListHtml } from './parse.js';
import { ADFG_TTL } from './ttl.js';
import type {
  AdfgClient,
  AdfgDetail,
  AdfgListSnapshot,
} from './types.js';

export const ADFG_EONR_BASE = 'https://www.adfg.alaska.gov/sf/EONR';

export type HttpAdfgClientOptions = {
  fetchImpl?: FetchLike;
  cache?: MemoryTtlCache;
  now?: () => Date;
  baseUrl?: string;
};

export class HttpAdfgClient implements AdfgClient {
  private readonly fetchImpl: FetchLike;
  private readonly cache: MemoryTtlCache;
  private readonly now: () => Date;
  private readonly baseUrl: string;

  constructor(options: HttpAdfgClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cache = options.cache ?? new MemoryTtlCache();
    this.now = options.now ?? (() => new Date());
    this.baseUrl = options.baseUrl ?? ADFG_EONR_BASE;
  }

  async fetchEmergencyOrderList(input: {
    regionCode: string;
    year: number;
  }): Promise<AdfgListSnapshot> {
    const key = `adfg:eonr:${input.regionCode}:${input.year}`;
    const hit = this.cache.get<AdfgListSnapshot>(key);
    if (hit) return hit;

    const sourceUrl = `${this.baseUrl}/index.cfm?ADFG=Region.${encodeURIComponent(input.regionCode)}&Year=${input.year}`;
    const html = await this.getText(sourceUrl);
    const snapshot = parseEonrListHtml(html, {
      sourceUrl,
      fetchedAt: this.now().toISOString(),
    });
    this.cache.set(key, snapshot, ADFG_TTL.regulationsMs);
    return snapshot;
  }

  async fetchEmergencyOrderDetail(detailPath: string): Promise<AdfgDetail> {
    const sourceUrl = detailPath.startsWith('http')
      ? detailPath
      : `https://www.adfg.alaska.gov${detailPath.startsWith('/') ? '' : '/'}${detailPath}`;
    const nrId = sourceUrl.match(/NRID=(\d+)/i)?.[1];
    if (!nrId) throw new Error(`ADF&G detail missing NRID: ${detailPath}`);

    const key = `adfg:detail:${nrId}`;
    const hit = this.cache.get<AdfgDetail>(key);
    if (hit) return hit;

    const html = await this.getText(sourceUrl);
    const detail = parseEonrDetailHtml(html, { nrId, sourceUrl });
    this.cache.set(key, detail, ADFG_TTL.regulationsMs);
    return detail;
  }

  private async getText(url: string): Promise<string> {
    const res = await fetchWithBackoff(url, { fetchImpl: this.fetchImpl });
    if (!res.ok) throw new Error(`ADF&G HTTP ${res.status} for ${url}`);
    return res.text();
  }
}
