import { describe, expect, it } from 'vitest';
import { meters, metersPerSecond } from '@troll/units';
import {
  LEADCORE_DEFAULT_PARAMS,
  solveLeadcore,
  solveWire,
} from './leadcore.js';
import { V_REF } from './v-ref.js';

describe('solveLeadcore', () => {
  it('matches folklore depth per color at V_REF', () => {
    const result = solveLeadcore({
      colorsOut: 1,
      stw: V_REF,
    });

    expect(result.depthPerColor).toBeCloseTo(LEADCORE_DEFAULT_PARAMS.c0, 9);
    expect(result.assumptions.some((a) => a.includes('ESTIMATED'))).toBe(true);
    expect(result.assumptions.some((a) => a.includes('TODO(calibrate)'))).toBe(
      true,
    );
  });

  it('shoals as speed rises', () => {
    const slow = solveLeadcore({
      colorsOut: 5,
      stw: metersPerSecond(1.0),
    });
    const fast = solveLeadcore({
      colorsOut: 5,
      stw: metersPerSecond(2.5),
    });

    expect(fast.depth).toBeLessThan(slow.depth);
  });

  it('scales linearly with colors out', () => {
    const one = solveLeadcore({ colorsOut: 1, stw: V_REF });
    const three = solveLeadcore({ colorsOut: 3, stw: V_REF });
    expect(three.depth).toBeCloseTo(one.depth * 3, 9);
  });
});

describe('solveWire', () => {
  it('accepts wireOut metres via the shared power law', () => {
    const result = solveWire({
      colorsOut: 0,
      wireOut: meters(27.432), // 30 yd ≈ 1 color
      stw: V_REF,
    });
    expect(result.depthPerColor).toBeCloseTo(LEADCORE_DEFAULT_PARAMS.c0, 6);
    expect(result.assumptions.some((a) => a.includes('wire'))).toBe(true);
  });
});
