import { describe, expect, it } from 'vitest';
import { FishTagCodeSchema, mintFishTagCode } from './fish-tag.js';

describe('fish tag codes', () => {
  it('mints printable TROLL-XXXXXXXX codes', () => {
    const code = mintFishTagCode('abc123xyz');
    expect(code).toBe('TROLL-ABC123XY');
    expect(FishTagCodeSchema.safeParse(code).success).toBe(true);
  });

  it('rejects malformed codes', () => {
    expect(FishTagCodeSchema.safeParse('FISH-123').success).toBe(false);
  });
});
