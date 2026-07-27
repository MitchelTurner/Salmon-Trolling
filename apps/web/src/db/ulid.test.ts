import { describe, expect, it } from 'vitest';
import { isUlid, ulid } from './ulid.js';

describe('ulid', () => {
  it('produces 26-char Crockford ids', () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(isUlid(id)).toBe(true);
  });

  it('sorts by time', () => {
    const a = ulid(1_700_000_000_000);
    const b = ulid(1_700_000_000_001);
    expect(a < b).toBe(true);
  });
});
