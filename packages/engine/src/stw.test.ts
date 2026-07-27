import { describe, expect, it } from 'vitest';
import { meters, metersPerSecond } from '@troll/units';
import {
  BARE_SOG_WARNING,
  resolveStw,
} from './stw.js';

describe('resolveStw', () => {
  it('prefers measured paddle-wheel STW (tier 1)', () => {
    const result = resolveStw({
      speedThroughWater: metersPerSecond(1.2),
      sog: metersPerSecond(2.0),
      sogVector: { eastMs: 2, northMs: 0 },
      predictedCurrent: {
        eastMs: 0.5,
        northMs: 0,
        stationId: 'TONGASS',
        stationDistanceM: meters(1200),
        predictionTimeOffsetS: 300,
      },
    });

    expect(result.source).toBe('paddle_wheel');
    expect(result.confidence).toBe('measured');
    expect(result.stw).toBe(1.2);
    expect(result.assumptions.some((a) => a.includes('measured'))).toBe(true);
    expect(result.assumptions).not.toContain(BARE_SOG_WARNING);
  });

  it('uses SOG minus predicted current when STW is unavailable (tier 2)', () => {
    const result = resolveStw({
      sogVector: { eastMs: 2.0, northMs: 0.0 },
      predictedCurrent: {
        eastMs: 0.8,
        northMs: 0.0,
        stationId: 'NOAA-ACT1234',
        stationDistanceM: 850,
        predictionTimeOffsetS: 120,
      },
      sog: metersPerSecond(2.0),
    });

    expect(result.source).toBe('sog_minus_current');
    expect(result.confidence).toBe('modelled');
    expect(result.stw).toBeCloseTo(1.2, 9);
    expect(result.assumptions.some((a) => a.includes('NOAA-ACT1234'))).toBe(
      true,
    );
    expect(result.assumptions.some((a) => a.includes('850'))).toBe(true);
    expect(result.assumptions.some((a) => a.includes('120'))).toBe(true);
    expect(result.assumptions).not.toContain(BARE_SOG_WARNING);
  });

  it('falls back to bare SOG with the loud tidal-current warning (tier 3)', () => {
    const result = resolveStw({
      sog: metersPerSecond(2.5),
    });

    expect(result.source).toBe('bare_sog');
    expect(result.confidence).toBe('modelled');
    expect(result.stw).toBe(2.5);
    expect(result.assumptions).toContain(BARE_SOG_WARNING);
  });

  it('always includes the exact bare-SOG warning string for every bare-SOG input', () => {
    const speeds = [0, 0.5, 1.286, 3.0, 5.5];
    for (const speed of speeds) {
      const result = resolveStw({ sog: metersPerSecond(speed) });
      expect(result.source).toBe('bare_sog');
      expect(result.assumptions).toContain(
        'no current correction available; depth may be off by 20%+ in tidal current',
      );
      expect(result.assumptions).toContain(BARE_SOG_WARNING);
    }
  });

  it('does not use bare SOG when a current-corrected vector is available', () => {
    const result = resolveStw({
      sog: metersPerSecond(4.5),
      sogVector: { eastMs: 4.5, northMs: 0 },
      predictedCurrent: {
        eastMs: 2.3,
        northMs: 0,
        stationId: 'TONGASS-NARROWS',
        stationDistanceM: 400,
        predictionTimeOffsetS: 0,
      },
    });

    expect(result.source).toBe('sog_minus_current');
    expect(result.stw).toBeCloseTo(2.2, 9);
    expect(result.assumptions).not.toContain(BARE_SOG_WARNING);
  });

  it('rejects empty input', () => {
    expect(() => resolveStw({})).toThrow(/requires/);
  });
});
