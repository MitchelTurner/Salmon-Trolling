import { describe, expect, it } from 'vitest';
import { BARE_SOG_WARNING } from '@troll/engine';
import { computeDepth, computeSpread } from './depth.js';
import type { CalcDepthBody, CalcSpreadBody } from './schemas.js';

const sanityDepthBody: CalcDepthBody = {
  stw: { sogMs: 2.5 * (1852 / 3600) },
  rig: {
    delivery: 'downrigger',
    cableOutM: 30.48,
    ballMassKg: 4.5359237,
    ballShape: 'sphere',
    cableDiameterM: 0.045 * 0.0254,
    terminalDragN: 10,
    releaseDropM: 1.2192,
    leaderLengthM: 1.524,
  },
};

describe('computeDepth', () => {
  it('returns lure depth for the downrigger sanity anchor', () => {
    const result = computeDepth(sanityDepthBody);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.depthM).toBeGreaterThan(0);
    expect(result.result.ballDepthM).toBeGreaterThan(0);
    expect(result.result.assumptions.some((a) => a.includes(BARE_SOG_WARNING))).toBe(
      true,
    );
  });

  it('marks paddle-wheel STW as measured', () => {
    const result = computeDepth({
      ...sanityDepthBody,
      stw: { speedThroughWaterMs: 1.3 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.confidence).toBe('measured');
    expect(result.result.stwSource).toBe('paddle_wheel');
  });

  it('supports diver delivery via engine charts', () => {
    const result = computeDepth({
      stw: { speedThroughWaterMs: 1.3 },
      rig: {
        delivery: 'diver',
        model: 'Deep Six',
        size: 'medium',
        settingIndex: 2,
        lineOutM: 45.72,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.depthM).toBeGreaterThan(0);
  });

  it('applies the narrowest calibration fit and reports it in assumptions', () => {
    const result = computeDepth({
      ...sanityDepthBody,
      stw: { speedThroughWaterMs: 1.286 },
      boatId: 'boat_1',
      rigId: 'rig_1',
      calibrationFits: [
        {
          id: 'g',
          scope: 'GLOBAL',
          params: { ballCd: 0.47 },
          rmseM: 0.5,
          sampleN: 100,
          fittedAt: '2026-07-01T00:00:00.000Z',
        },
        {
          id: 'r',
          scope: 'RIG',
          boatId: 'boat_1',
          rigId: 'rig_1',
          params: { ballCd: 0.7 },
          rmseM: 0.15,
          sampleN: 20,
          fittedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.result.assumptions.some((a) => a.includes('FITTED RIG')),
    ).toBe(true);
    expect(
      result.result.assumptions.some((a) => a.includes('ball Cd=0.700')),
    ).toBe(true);
  });
});

describe('computeSpread', () => {
  it('returns per-rig depths and turn swings', () => {
    const body: CalcSpreadBody = {
      stw: { speedThroughWaterMs: 1.3 },
      omegaRadPerS: 0.05,
      rigs: [
        {
          id: 'port',
          lateralOffsetM: -2,
          rig: sanityDepthBody.rig,
        },
        {
          id: 'starboard',
          lateralOffsetM: 2,
          rig: sanityDepthBody.rig,
        },
      ],
    };

    const result = computeSpread(body);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.results).toHaveLength(2);
    expect(result.spread.rigs).toHaveLength(2);
    expect(result.spread.rigs[0]?.localSpeedMs).not.toBe(
      result.spread.rigs[1]?.localSpeedMs,
    );
  });
});
