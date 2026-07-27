import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalJson } from './canonical.js';

export type SignableBundle = {
  regionId: string;
  startIso: string;
  expiresAt: string;
  schemaVersion: number;
  windowHours: number;
  tides: unknown;
  currents: unknown;
  forecast: unknown;
  regs: unknown;
  sunMoon: unknown;
  bathyTileRefs: unknown;
};

/** HMAC-SHA256 hex digest over the canonical unsigned bundle body. */
export function signBundle(
  payload: SignableBundle,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(canonicalJson(payload))
    .digest('hex');
}

export function verifyBundleSignature(
  payload: SignableBundle,
  signature: string,
  secret: string,
): boolean {
  const expected = signBundle(payload, secret);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
