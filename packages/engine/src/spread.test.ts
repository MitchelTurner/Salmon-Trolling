import { describe, expect, it } from 'vitest';
import {
  meters,
  metersPerSecond,
  radians,
} from '@troll/units';
import {
  DEFAULT_TANGLE_THRESHOLD_M,
  analyzeSpread,
  lateralOffsetFromTurnCenter,
  localSpeedInTurn,
} from './spread.js';

describe('localSpeedInTurn', () => {
  it('slows the inside (starboard) rod on a starboard turn', () => {
    const stw = metersPerSecond(2.0);
    const omega = 0.1; // rad/s to starboard
    const starboard = meters(3);
    const port = meters(-3);

    const inside = localSpeedInTurn(stw, omega, starboard);
    const outside = localSpeedInTurn(stw, omega, port);

    expect(inside).toBeLessThan(stw);
    expect(outside).toBeGreaterThan(stw);
    expect(inside).toBeCloseTo(2.0 - 0.1 * 3, 9);
    expect(outside).toBeCloseTo(2.0 + 0.1 * 3, 9);
  });

  it('matches stw + omega * lateralOffsetFromTurnCenter', () => {
    const stw = metersPerSecond(1.5);
    const omega = -0.2;
    const y = meters(2.5);
    expect(localSpeedInTurn(stw, omega, y)).toBeCloseTo(
      stw + omega * lateralOffsetFromTurnCenter(y),
      9,
    );
  });

  it('clamps local speed at zero', () => {
    expect(localSpeedInTurn(metersPerSecond(0.2), 0.5, meters(2))).toBe(0);
  });
});

describe('analyzeSpread', () => {
  it('exposes per-rod depth swing from local speeds', () => {
    // Toy depth model: deeper when slower (blowback falls off).
    const depthAtStw = (stw: number) => meters(30 - 5 * stw);

    const result = analyzeSpread({
      stw: metersPerSecond(2),
      omega: radians(0.1),
      rigs: [
        {
          id: 'inside',
          lateralOffset: meters(4),
          setback: meters(15),
          depth: depthAtStw(2),
          depthAtStw: (s) => depthAtStw(s),
        },
        {
          id: 'outside',
          lateralOffset: meters(-4),
          setback: meters(15),
          depth: depthAtStw(2),
          depthAtStw: (s) => depthAtStw(s),
        },
      ],
    });

    const inside = result.rigs.find((r) => r.id === 'inside');
    const outside = result.rigs.find((r) => r.id === 'outside');
    expect(inside).toBeDefined();
    expect(outside).toBeDefined();

    // Inside slows → deeper (positive swing); outside speeds up → shallower.
    expect(inside!.depthSwing).toBeGreaterThan(0);
    expect(outside!.depthSwing).toBeLessThan(0);
  });

  it('warns when predicted horizontal positions converge within the threshold', () => {
    const depthAtStw = () => meters(20);

    const result = analyzeSpread({
      stw: metersPerSecond(2),
      omega: 0,
      tangleThreshold: meters(3),
      rigs: [
        {
          id: 'r1',
          lateralOffset: meters(1),
          setback: meters(10),
          depth: meters(20),
          depthAtStw,
        },
        {
          id: 'r2',
          lateralOffset: meters(2),
          setback: meters(10.5),
          depth: meters(20),
          depthAtStw,
        },
        {
          id: 'r3',
          lateralOffset: meters(-5),
          setback: meters(25),
          depth: meters(20),
          depthAtStw,
        },
      ],
    });

    expect(result.tangleWarnings.length).toBe(1);
    expect(result.tangleWarnings[0]?.rigIdA).toBe('r1');
    expect(result.tangleWarnings[0]?.rigIdB).toBe('r2');
    expect(result.tangleWarnings[0]?.separation).toBeLessThanOrEqual(3);
    expect(result.tangleWarnings[0]?.threshold).toBe(3);
  });

  it('uses setbackAtStw when provided for tangle geometry', () => {
    const result = analyzeSpread({
      stw: metersPerSecond(2),
      omega: 0.05,
      tangleThreshold: meters(1.5),
      rigs: [
        {
          id: 'a',
          lateralOffset: meters(2),
          setback: meters(20),
          depth: meters(25),
          depthAtStw: () => meters(25),
          // Inside slows → more setback in this toy model, pulling toward the other rig.
          setbackAtStw: (stw) => meters(20 + (2 - stw) * 10),
        },
        {
          id: 'b',
          lateralOffset: meters(2.5),
          setback: meters(21),
          depth: meters(25),
          depthAtStw: () => meters(25),
          setbackAtStw: (stw) => meters(21 + (2 - stw) * 10),
        },
      ],
    });

    expect(result.tangleWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it('defaults the tangle threshold to 2 m', () => {
    expect(DEFAULT_TANGLE_THRESHOLD_M).toBe(2);

    const clear = analyzeSpread({
      stw: metersPerSecond(2),
      omega: 0,
      rigs: [
        {
          id: 'a',
          lateralOffset: meters(0),
          setback: meters(10),
          depth: meters(15),
          depthAtStw: () => meters(15),
        },
        {
          id: 'b',
          lateralOffset: meters(0),
          setback: meters(13),
          depth: meters(15),
          depthAtStw: () => meters(15),
        },
      ],
    });
    expect(clear.tangleWarnings).toHaveLength(0);

    const close = analyzeSpread({
      stw: metersPerSecond(2),
      omega: 0,
      rigs: [
        {
          id: 'a',
          lateralOffset: meters(0),
          setback: meters(10),
          depth: meters(15),
          depthAtStw: () => meters(15),
        },
        {
          id: 'b',
          lateralOffset: meters(0),
          setback: meters(11.5),
          depth: meters(15),
          depthAtStw: () => meters(15),
        },
      ],
    });
    expect(close.tangleWarnings).toHaveLength(1);
  });
});
