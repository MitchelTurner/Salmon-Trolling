import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  METERS_PER_FOOT,
  meters,
  metersPerSecond,
  newtons,
  radiansToDegrees,
} from '@troll/units';
import { sanityAnchorInput } from './downrigger.sanity.js';
import { frontalArea, solveDownrigger } from './downrigger.js';

const goldenDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../test/golden/regression',
);

describe('solveDownrigger', () => {
  it('matches the worked sanity-anchor table', () => {
    const result = solveDownrigger(sanityAnchorInput(200));
    const depthFt = result.ballDepth / METERS_PER_FOOT;
    const setbackFt = result.setback / METERS_PER_FOOT;
    const angleDeg = Number(radiansToDegrees(result.blowbackAngle));

    expect(result.diagnostics.ballSubmergedWeight).toBeCloseTo(40.5, 0);
    expect(result.diagnostics.ballDrag).toBeCloseTo(2.6, 0);
    expect(result.diagnostics.totalCableNormalDrag).toBeGreaterThanOrEqual(20);
    expect(result.diagnostics.totalCableNormalDrag).toBeLessThanOrEqual(35);
    expect(angleDeg).toBeGreaterThanOrEqual(45);
    expect(angleDeg).toBeLessThanOrEqual(50);
    expect(depthFt).toBeGreaterThanOrEqual(79);
    expect(depthFt).toBeLessThanOrEqual(89);
    expect(setbackFt).toBeGreaterThanOrEqual(42);
    expect(setbackFt).toBeLessThanOrEqual(58);

    expect(result.assumptions.some((a) => a.includes('CD_CYL_NORMAL'))).toBe(
      true,
    );
  });

  it('is stable to <0.01 m between 200 and 2000 segments', () => {
    const coarse = solveDownrigger(sanityAnchorInput(200));
    const fine = solveDownrigger(sanityAnchorInput(2000));

    expect(Math.abs(coarse.ballDepth - fine.ballDepth)).toBeLessThan(0.01);
    expect(Math.abs(coarse.setback - fine.setback)).toBeLessThan(0.01);
  });

  it('shoals the ball under way versus hanging at rest', () => {
    const underWay = solveDownrigger(sanityAnchorInput(200));
    const atRest = solveDownrigger({
      ...sanityAnchorInput(200),
      stw: metersPerSecond(0),
      // Drag is hydrodynamic; at rest there is no terminal drag force.
      terminalDrag: newtons(0),
    });

    // At rest the cable hangs vertical: depth ≈ cable-out, setback ≈ 0.
    expect(atRest.ballDepth).toBeCloseTo(Number(sanityAnchorInput().cableOut), 2);
    expect(atRest.setback).toBeCloseTo(0, 2);
    // Under way, blowback shoals the ball.
    expect(underWay.ballDepth).toBeLessThan(atRest.ballDepth);
    expect(underWay.setback).toBeGreaterThan(1);
  });

  it('rejects invalid segment counts', () => {
    expect(() =>
      solveDownrigger({ ...sanityAnchorInput(), segments: 0 }),
    ).toThrow(/segments/);
  });

  it('computes sphere frontal area from lead density', () => {
    const mass = sanityAnchorInput().ball.mass;
    const { area, assumptions } = frontalArea(mass, 'sphere');
    expect(area).toBeGreaterThan(0);
    expect(assumptions).toHaveLength(0);
  });
});

describe('golden regression fixtures', () => {
  it('locks the sanity-anchor downrigger output', () => {
    const fixturePath = join(goldenDir, 'downrigger-sanity-anchor.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      segments: number;
      expected: {
        ballDepth: number;
        setback: number;
        blowbackAngle: number;
        ballSubmergedWeight: number;
        ballDrag: number;
        totalCableNormalDrag: number;
      };
    };

    const result = solveDownrigger(sanityAnchorInput(fixture.segments));

    expect(result.ballDepth).toBeCloseTo(fixture.expected.ballDepth, 9);
    expect(result.setback).toBeCloseTo(fixture.expected.setback, 9);
    expect(result.blowbackAngle).toBeCloseTo(fixture.expected.blowbackAngle, 9);
    expect(result.diagnostics.ballSubmergedWeight).toBeCloseTo(
      fixture.expected.ballSubmergedWeight,
      9,
    );
    expect(result.diagnostics.ballDrag).toBeCloseTo(fixture.expected.ballDrag, 9);
    expect(result.diagnostics.totalCableNormalDrag).toBeCloseTo(
      fixture.expected.totalCableNormalDrag,
      9,
    );
  });

  it('locks a short-cable / no-terminal-drag case', () => {
    const fixturePath = join(goldenDir, 'downrigger-short-bare.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      segments: number;
      cableOutM: number;
      terminalDragN: number;
      expected: {
        ballDepth: number;
        setback: number;
        blowbackAngle: number;
      };
    };

    const base = sanityAnchorInput(fixture.segments);
    const result = solveDownrigger({
      ...base,
      cableOut: meters(fixture.cableOutM),
      terminalDrag: newtons(fixture.terminalDragN),
    });

    expect(result.ballDepth).toBeCloseTo(fixture.expected.ballDepth, 9);
    expect(result.setback).toBeCloseTo(fixture.expected.setback, 9);
    expect(result.blowbackAngle).toBeCloseTo(fixture.expected.blowbackAngle, 9);
  });
});
