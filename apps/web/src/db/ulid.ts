/**
 * Client-generated ULIDs. The server never assigns identity — records are
 * created hours before they are transmitted (docs/05-offline-sync.md).
 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(ms: number): string {
  let t = ms;
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out = CROCKFORD[t % 32] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeRandom(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  // 80 bits of entropy → 16 Crockford chars
  let acc = 0;
  let bits = 0;
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < 16) {
      bits -= 5;
      out += CROCKFORD[(acc >>> bits) & 31];
    }
  }
  while (out.length < 16) {
    out += CROCKFORD[0];
  }
  return out;
}

/** 26-char Crockford Base32 ULID. Lexicographically sortable by time. */
export function ulid(nowMs: number = Date.now()): string {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error('ulid time must be a non-negative finite number');
  }
  return encodeTime(Math.floor(nowMs)) + encodeRandom();
}

export function isUlid(value: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
}
