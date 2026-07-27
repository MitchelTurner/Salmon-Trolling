import { describe, expect, it } from 'vitest';
import { meters, metersPerSecond } from '@troll/units';
import {
  STW_SIGMA_KT,
  WIDE_SIGMA_FRACTION,
  composeSigma,
  parseRelativeUncertainty,
  stwSigmaMs,
} from './uncertainty.js';

describe('parseRelativeUncertainty', () => {
  it('parses percent and bare fraction forms', () => {
    expect(parseRelativeUncertainty('±20%')).toBeCloseTo(0.2, 9);
    expect(parseRelativeUncertainty('± 40 %')).toBeCloseTo(0.4, 9);
    expect(parseRelativeUncertainty('±0.5')).toBeCloseTo(0.5, 9);
  });
});

describe('stwSigmaMs', () => {
  it('uses the spec knot bands per STW source', () => {
    expect(STW_SIGMA_KT.paddle_wheel).toBe(0.1);
    expect(STW_SIGMA_KT.sog_minus_current).toBe(0.4);
    expect(STW_SIGMA_KT.bare_sog).toBe(1.0);

    expect(stwSigmaMs('paddle_wheel')).toBeCloseTo(
      0.1 * (1852 / 3600),
      12,
    );
    expect(stwSigmaMs('bare_sog')).toBeCloseTo(1.0 * (1852 / 3600), 12);
  });
});

describe('composeSigma', () => {
  it('propagates STW uncertainty by finite difference and RSS', () => {
    // Toy model: depth = 10 * stw (metres when stw in m/s).
    const depthAtStw = (stwMs: number) => 10 * stwMs;
    const stw = metersPerSecond(2);
    const depth = meters(depthAtStw(stw));

    const result = composeSigma({
      depth,
      stw,
      stwSource: 'paddle_wheel',
      depthAtStw,
    });

    const expected = 10 * Number(stwSigmaMs('paddle_wheel'));
    expect(result.sigma).toBeCloseTo(expected, 9);
    expect(result.components).toHaveLength(1);
    expect(result.wide).toBe(result.sigma > WIDE_SIGMA_FRACTION * depth);
  });

  it('RSSes STW, estimated-constant, and fit contributions', () => {
    // depth = 20 * stw * cdScale
    const depthAtStw = (stwMs: number) => 20 * stwMs;
    const stw = metersPerSecond(1.5);
    const depth = meters(30);

    const result = composeSigma({
      depth,
      stw,
      stwSource: 'sog_minus_current',
      depthAtStw,
      estimatedConstants: [
        {
          name: 'CD_CYL_NORMAL',
          relativeSigma: parseRelativeUncertainty('±20%'),
          depthAtScale: (scale) => 20 * stw * scale,
        },
      ],
      fitRmse: meters(0.5),
    });

    const stwTerm = 20 * Number(stwSigmaMs('sog_minus_current'));
    const cdTerm = Math.abs(20 * stw * 1.2 - 20 * stw * 0.8) / 2;
    const fitTerm = 0.5;
    const expected = Math.hypot(stwTerm, cdTerm, fitTerm);

    expect(result.sigma).toBeCloseTo(expected, 9);
    expect(result.components.map((c) => c.name).sort()).toEqual(
      ['constant:CD_CYL_NORMAL', 'fit:rmse', 'stw:sog_minus_current'].sort(),
    );
  });

  it('flags wide when sigma exceeds 20% of depth', () => {
    // Bare SOG with a steep depth/STW slope → large sigma.
    const depthAtStw = (stwMs: number) => 40 * stwMs;
    const stw = metersPerSecond(1);
    const depth = meters(10); // deliberately small depth so band is wide

    const result = composeSigma({
      depth,
      stw,
      stwSource: 'bare_sog',
      depthAtStw,
    });

    expect(result.sigma).toBeGreaterThan(WIDE_SIGMA_FRACTION * depth);
    expect(result.wide).toBe(true);
  });

  it('does not flag wide for a tight measured band on deep water', () => {
    const depthAtStw = (stwMs: number) => 5 * stwMs + 20;
    const stw = metersPerSecond(2);
    const depth = meters(depthAtStw(stw));

    const result = composeSigma({
      depth,
      stw,
      stwSource: 'paddle_wheel',
      depthAtStw,
    });

    expect(result.wide).toBe(false);
    expect(result.sigma).toBeLessThan(WIDE_SIGMA_FRACTION * depth);
  });

  it('bare SOG contributes a larger STW band than measured', () => {
    const depthAtStw = (stwMs: number) => 15 * stwMs;
    const stw = metersPerSecond(2);
    const depth = meters(30);

    const measured = composeSigma({
      depth,
      stw,
      stwSource: 'paddle_wheel',
      depthAtStw,
    });
    const bare = composeSigma({
      depth,
      stw,
      stwSource: 'bare_sog',
      depthAtStw,
    });

    expect(bare.sigma).toBeGreaterThan(measured.sigma);
  });
});
