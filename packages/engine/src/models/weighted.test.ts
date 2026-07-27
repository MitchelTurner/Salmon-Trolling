import { describe, expect, it } from 'vitest';
import {
  kilograms,
  meters,
  metersPerSecond,
  newtons,
} from '@troll/units';
import { kgPerM } from './downrigger.js';
import { solveFlatline, solveWeighted } from './weighted.js';

const mono = {
  diameter: meters(0.00045),
  linearMass: kgPerM(Math.PI * (0.00045 / 2) ** 2 * 1140),
};

describe('solveWeighted', () => {
  it('documents use of the shared towed-cable path', () => {
    const result = solveWeighted({
      lineOut: meters(30),
      stw: metersPerSecond(1.286),
      weight: { mass: kilograms(1), shape: 'sphere' },
      line: mono,
      terminalDrag: newtons(2),
    });

    expect(result.depth).toBeGreaterThan(5);
    expect(result.setback).toBeGreaterThan(0);
    expect(
      result.assumptions.some((a) => a.includes('shared towed-cable')),
    ).toBe(true);
  });

  it('runs deeper with more weight at the same speed', () => {
    const light = solveWeighted({
      lineOut: meters(40),
      stw: metersPerSecond(1.5),
      weight: { mass: kilograms(0.5), shape: 'sphere' },
      line: mono,
    });
    const heavy = solveWeighted({
      lineOut: meters(40),
      stw: metersPerSecond(1.5),
      weight: { mass: kilograms(2), shape: 'sphere' },
      line: mono,
    });

    expect(heavy.depth).toBeGreaterThan(light.depth);
  });
});

describe('solveFlatline', () => {
  it('is the zero-weight shared-path case', () => {
    const result = solveFlatline({
      lineOut: meters(25),
      stw: metersPerSecond(1.286),
      line: mono,
      terminalDrag: newtons(1),
    });

    expect(result.assumptions.some((a) => a.includes('flatline'))).toBe(true);
    expect(result.assumptions.some((a) => a.includes('shared towed-cable'))).toBe(
      true,
    );

    const weighted = solveWeighted({
      lineOut: meters(25),
      stw: metersPerSecond(1.286),
      weight: { mass: kilograms(1), shape: 'sphere' },
      line: mono,
      terminalDrag: newtons(1),
    });
    expect(result.depth).toBeLessThan(weighted.depth);
  });
});
