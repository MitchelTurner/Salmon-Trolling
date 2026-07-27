import {
  DEFAULT_REGION_ID,
  type RegionId,
} from '@troll/shared';
import type { BundleRecord } from '../db/types.js';
import { saveLocalBundle } from './store.js';

export type FetchBundleOptions = {
  regionId?: RegionId;
  window?: string;
  apiBase?: string;
  /** Full Authorization header value, e.g. `Bearer troll.…`. */
  authorization?: string;
  fetchImpl?: typeof fetch;
};

type BundleApiResponse = {
  meta?: {
    regionId?: string;
    startIso?: string;
    expiresAt?: string;
    generatedAt?: string;
    schemaVersion?: number;
    signature?: string;
  };
  generatedAt?: string;
  tides?: unknown;
  currents?: unknown;
  forecast?: unknown;
  regs?: unknown;
  sunMoon?: unknown;
  bathyTileRefs?: unknown;
};

/**
 * Pull a dock bundle over wifi and store it in IndexedDB.
 * UI still reads only from IndexedDB afterward.
 */
export async function refreshDockBundle(
  options: FetchBundleOptions = {},
): Promise<BundleRecord> {
  const regionId = options.regionId ?? DEFAULT_REGION_ID;
  const window = options.window ?? '48h';
  const apiBase = (options.apiBase ?? '').replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;

  const url = `${apiBase}/bundles/${encodeURIComponent(regionId)}?window=${encodeURIComponent(window)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.authorization) {
    headers.Authorization = options.authorization;
  }

  const res = await fetchImpl(url, { headers });
  if (!res.ok) {
    throw new Error(`bundle refresh failed (${res.status})`);
  }

  const body = (await res.json()) as BundleApiResponse;
  const meta = body.meta;
  if (
    !meta?.startIso ||
    !meta.expiresAt ||
    !meta.signature ||
    meta.schemaVersion === undefined
  ) {
    throw new Error('bundle response missing meta');
  }

  const generatedAt = meta.generatedAt ?? body.generatedAt;
  if (!generatedAt) throw new Error('bundle response missing generatedAt');

  return saveLocalBundle({
    regionId,
    startIso: meta.startIso,
    expiresAt: meta.expiresAt,
    generatedAt,
    schemaVersion: meta.schemaVersion,
    signature: meta.signature,
    payload: {
      tides: body.tides ?? [],
      currents: body.currents ?? [],
      forecast: body.forecast ?? null,
      regs: body.regs ?? null,
      sunMoon: body.sunMoon ?? null,
      bathyTileRefs: body.bathyTileRefs ?? [],
      meta,
    },
  });
}
