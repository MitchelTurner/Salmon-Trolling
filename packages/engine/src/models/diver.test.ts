import { describe, expect, it } from 'vitest';
import { meters, metersPerSecond } from '@troll/units';
import { solveDiver } from './diver.js';

describe('solveDiver', () => {
  it('returns a fitted depth for Deep Six medium setting 2', () => {
    const result = solveDiver({
      model: 'Deep Six',
      size: 'medium',
      settingIndex: 2,
      lineOut: meters(45),
      stw: metersPerSecond((2.5 * 1852) / 3600),
    });

    expect(result.outOfRange).toBe(false);
    expect(result.depth).toBeGreaterThan(5);
    expect(result.assumptions.some((a) => a.includes('MANUFACTURER'))).toBe(
      true,
    );
  });

  it('sets outOfRange outside the chart domain', () => {
    const result = solveDiver({
      model: 'Deep Six',
      size: 'medium',
      settingIndex: 2,
      lineOut: meters(200),
      stw: metersPerSecond(1.0),
    });

    expect(result.outOfRange).toBe(true);
    expect(result.assumptions.some((a) => a.includes('outOfRange'))).toBe(true);
  });
});
