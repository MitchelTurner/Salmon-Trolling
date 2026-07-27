import { describe, expect, it } from 'vitest';
import { V_REF } from '../models/v-ref.js';
import {
  DEEP_SIX_MEDIUM_SETTING_2,
  evaluateDiverFit,
  fitDiverPowerLaw,
  isDiverOutOfRange,
} from './divers.js';

describe('diver chart fits', () => {
  it('tags Deep Six chart as MANUFACTURER with a source URL', () => {
    expect(DEEP_SIX_MEDIUM_SETTING_2.tag).toBe('MANUFACTURER');
    expect(DEEP_SIX_MEDIUM_SETTING_2.sourceUrl).toMatch(/^https?:\/\//);
    expect(DEEP_SIX_MEDIUM_SETTING_2.points.length).toBeGreaterThanOrEqual(3);
  });

  it('recovers a known power law by least squares', () => {
    const k = 0.4;
    const alpha = 0.9;
    const beta = -0.7;
    const points = [20, 40, 60].flatMap((lineOutM) =>
      [1.0, 1.5, 2.0].map((stwMs) => ({
        lineOutM,
        stwMs,
        depthM: k * lineOutM ** alpha * (stwMs / V_REF) ** beta,
      })),
    );

    const fit = fitDiverPowerLaw(points);
    expect(fit.k).toBeCloseTo(k, 6);
    expect(fit.alpha).toBeCloseTo(alpha, 6);
    expect(fit.beta).toBeCloseTo(beta, 6);
    expect(fit.rmseM).toBeLessThan(1e-9);
  });

  it('flags outOfRange outside the fitted domain', () => {
    const fit = DEEP_SIX_MEDIUM_SETTING_2.fit;
    expect(isDiverOutOfRange(fit, fit.lineOutMinM, fit.stwMinMs)).toBe(false);
    expect(isDiverOutOfRange(fit, fit.lineOutMaxM + 1, fit.stwMinMs)).toBe(
      true,
    );
    expect(isDiverOutOfRange(fit, fit.lineOutMinM, fit.stwMaxMs + 0.5)).toBe(
      true,
    );
  });

  it('evaluates depth inside the Deep Six domain', () => {
    const fit = DEEP_SIX_MEDIUM_SETTING_2.fit;
    const depth = evaluateDiverFit(fit, 45, 2.5 * (1852 / 3600));
    expect(depth).toBeGreaterThan(5);
    expect(depth).toBeLessThan(80);
  });
});
