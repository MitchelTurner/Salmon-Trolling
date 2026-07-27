import { describe, expect, it } from 'vitest';
import {
  meters,
  metersPerSecond,
  newtons,
} from '@troll/units';
import {
  kgPerM,
  lurePositionFromBall,
  solveLeader,
} from './leader.js';

const mono = { diameter: meters(0.00045) };

describe('solveLeader', () => {
  it('streams nearly horizontal under attractor drag (setback ≈ length, no sink)', () => {
    const result = solveLeader({
      leaderLength: meters(1.5),
      stw: metersPerSecond(1.286), // 2.5 kt
      leader: mono,
      attractorDrag: newtons(10),
    });

    expect(result.leaderRise).toBe(0);
    expect(result.leaderSetback).toBeCloseTo(1.5, 3);
    expect(
      result.assumptions.some((a) => a.includes('no concentrated weight')),
    ).toBe(true);
  });

  it('scales setback with leader length', () => {
    const short = solveLeader({
      leaderLength: meters(0.75),
      stw: metersPerSecond(1.286),
      leader: mono,
      attractorDrag: newtons(10),
    });
    const long = solveLeader({
      leaderLength: meters(3),
      stw: metersPerSecond(1.286),
      leader: mono,
      attractorDrag: newtons(10),
    });

    expect(short.leaderSetback).toBeCloseTo(0.75, 3);
    expect(long.leaderSetback).toBeCloseTo(3, 3);
  });

  it('hangs with no setback when drag and speed are zero', () => {
    const result = solveLeader({
      leaderLength: meters(1.5),
      stw: metersPerSecond(0),
      leader: mono,
      attractorDrag: newtons(0),
    });

    expect(result.leaderSetback).toBeCloseTo(0, 2);
    expect(result.leaderRise).toBe(0);
    // Vertical hang would sag the full length; clamped so the lure does not sink
    // below the release in the published depth formula.
    expect(result.assumptions.some((a) => a.includes('sag'))).toBe(true);
  });

  it('lays out further as attractor drag rises on a heavy leader', () => {
    // Exaggerate line weight so sag-vs-drag is visible in setback.
    const heavy = { diameter: meters(0.002), linearMass: kgPerM(0.05) };
    const lightDrag = solveLeader({
      leaderLength: meters(2),
      stw: metersPerSecond(1.0),
      leader: heavy,
      attractorDrag: newtons(0.5),
    });
    const heavyDrag = solveLeader({
      leaderLength: meters(2),
      stw: metersPerSecond(1.0),
      leader: heavy,
      attractorDrag: newtons(25),
    });

    expect(heavyDrag.leaderSetback).toBeGreaterThan(lightDrag.leaderSetback);
  });

  it('lays out further as speed rises on a heavy leader (line hydrodynamics)', () => {
    const heavy = { diameter: meters(0.002), linearMass: kgPerM(0.05) };
    const slow = solveLeader({
      leaderLength: meters(2),
      stw: metersPerSecond(0.4),
      leader: heavy,
      attractorDrag: newtons(5),
    });
    const fast = solveLeader({
      leaderLength: meters(2),
      stw: metersPerSecond(2.5),
      leader: heavy,
      attractorDrag: newtons(5),
    });

    expect(fast.leaderSetback).toBeGreaterThan(slow.leaderSetback);
  });

  it('rejects invalid inputs', () => {
    expect(() =>
      solveLeader({
        leaderLength: meters(-1),
        stw: metersPerSecond(1),
        leader: mono,
        attractorDrag: newtons(1),
      }),
    ).toThrow(/leaderLength/);
  });
});

describe('lurePositionFromBall', () => {
  it('applies the spec formula relative to the ball', () => {
    const leader = solveLeader({
      leaderLength: meters(1.5),
      stw: metersPerSecond(1.286),
      leader: mono,
      attractorDrag: newtons(10),
    });

    const lure = lurePositionFromBall({
      ballDepth: meters(25.26),
      ballSetback: meters(16.51),
      releaseDropHeight: meters(1.2),
      leader,
    });

    expect(lure.lureDepth).toBeCloseTo(
      25.26 + 1.2 - leader.leaderRise,
      9,
    );
    expect(lure.lureSetback).toBeCloseTo(
      16.51 + leader.leaderSetback,
      9,
    );
  });

  it('shoals the lure when leaderRise is positive', () => {
    const lure = lurePositionFromBall({
      ballDepth: meters(20),
      ballSetback: meters(10),
      releaseDropHeight: meters(1),
      leader: {
        leaderRise: meters(0.4),
        leaderSetback: meters(1.2),
        assumptions: [],
      },
    });

    expect(lure.lureDepth).toBeCloseTo(20.6, 9);
    expect(lure.lureSetback).toBeCloseTo(11.2, 9);
  });
});
