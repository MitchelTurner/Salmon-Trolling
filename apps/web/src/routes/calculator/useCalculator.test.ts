import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS } from './types.js';
import { computeCalculator } from './useCalculator.js';

describe('computeCalculator', () => {
  it('computes a positive downrigger lure depth offline', () => {
    const result = computeCalculator(DEFAULT_INPUTS);
    expect(result.error).toBeUndefined();
    expect(result.depthM).toBeGreaterThan(0);
    expect(result.ballDepthM).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.confidence).toBe('modelled');
  });

  it('flags bare SOG with the loud current warning', () => {
    const result = computeCalculator(DEFAULT_INPUTS);
    expect(
      result.assumptions.some((a) => a.includes('no current correction')),
    ).toBe(true);
  });

  it('uses measured confidence for paddle-wheel STW', () => {
    const result = computeCalculator({
      ...DEFAULT_INPUTS,
      stwMode: 'paddle_wheel',
    });
    expect(result.confidence).toBe('measured');
  });

  it('supports all delivery types without throwing', () => {
    const deliveries = [
      'DOWNRIGGER',
      'DIVER',
      'LEADCORE',
      'WIRE',
      'WEIGHTED',
      'FLATLINE',
    ] as const;

    for (const delivery of deliveries) {
      const result = computeCalculator({ ...DEFAULT_INPUTS, delivery });
      expect(result).toBeDefined();
      if (!result.error) {
        expect(result.depthM).toBeGreaterThanOrEqual(0);
        expect(result.assumptions.length).toBeGreaterThan(0);
      }
    }
  });
});
