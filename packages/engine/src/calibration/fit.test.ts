import { describe, expect, it } from 'vitest';
import {
  kilograms,
  meters,
  metersPerSecond,
  newtons,
} from '@troll/units';
import { kgPerM, solveDownrigger } from '../models/downrigger.js';
import {
  fitBallCd,
  fittedCdAssumption,
  selectNarrowestFit,
  type CalibrationSample,
  type StoredCalibrationFit,
} from './fit.js';

const BASE = {
  cableOutM: 30.48,
  stwMs: 1.286,
  ballMassKg: 4.5359237,
  ballShape: 'sphere' as const,
  cableDiameterM: 0.001143,
  cableLinearMassKgPerM: 0.00805,
  terminalDragN: 10,
};

function sampleAtCd(cd: number, measuredDepthM?: number): CalibrationSample {
  const result = solveDownrigger({
    cableOut: meters(BASE.cableOutM),
    stw: metersPerSecond(BASE.stwMs),
    ball: {
      mass: kilograms(BASE.ballMassKg),
      shape: BASE.ballShape,
      cd,
    },
    cable: {
      diameter: meters(BASE.cableDiameterM),
      linearMass: kgPerM(BASE.cableLinearMassKgPerM),
    },
    terminalDrag: newtons(BASE.terminalDragN),
    segments: 80,
  });
  return {
    ...BASE,
    measuredDepthM: measuredDepthM ?? Number(result.ballDepth),
  };
}

describe('fitBallCd', () => {
  it('recovers a planted ball Cd within the search grid', () => {
    const planted = 0.65;
    const samples = [
      sampleAtCd(planted),
      sampleAtCd(planted),
      {
        ...sampleAtCd(planted),
        stwMs: 1.5,
        measuredDepthM: Number(
          solveDownrigger({
            cableOut: meters(BASE.cableOutM),
            stw: metersPerSecond(1.5),
            ball: {
              mass: kilograms(BASE.ballMassKg),
              shape: 'sphere',
              cd: planted,
            },
            cable: {
              diameter: meters(BASE.cableDiameterM),
              linearMass: kgPerM(BASE.cableLinearMassKgPerM),
            },
            terminalDrag: newtons(BASE.terminalDragN),
            segments: 80,
          }).ballDepth,
        ),
      },
    ];

    const fit = fitBallCd(samples, {
      scope: 'GLOBAL',
      cdMin: 0.4,
      cdMax: 0.9,
      steps: 50,
      segments: 80,
    });

    expect(fit.params.ballCd).toBeCloseTo(planted, 2);
    expect(fit.rmseM).toBeLessThan(0.05);
    expect(fit.sampleN).toBe(3);
  });
});

describe('selectNarrowestFit', () => {
  const fits: StoredCalibrationFit[] = [
    {
      id: 'g',
      scope: 'GLOBAL',
      params: { ballCd: 0.5 },
      rmseM: 0.4,
      sampleN: 100,
      fittedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'b',
      scope: 'BOAT',
      boatId: 'boat_1',
      params: { ballCd: 0.55 },
      rmseM: 0.3,
      sampleN: 40,
      fittedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'r',
      scope: 'RIG',
      boatId: 'boat_1',
      rigId: 'rig_1',
      params: { ballCd: 0.6 },
      rmseM: 0.2,
      sampleN: 20,
      fittedAt: '2026-01-03T00:00:00.000Z',
    },
  ];

  it('prefers RIG over BOAT over GLOBAL', () => {
    const pick = selectNarrowestFit(fits, {
      boatId: 'boat_1',
      rigId: 'rig_1',
    });
    expect(pick?.id).toBe('r');
    expect(fittedCdAssumption(pick!)).toContain('FITTED RIG');
  });

  it('falls back to BOAT when rig fit missing', () => {
    const pick = selectNarrowestFit(fits, {
      boatId: 'boat_1',
      rigId: 'rig_other',
    });
    expect(pick?.id).toBe('b');
  });

  it('ignores superseded fits', () => {
    const pick = selectNarrowestFit(
      fits.map((f) =>
        f.id === 'r' ? { ...f, supersededAt: '2026-02-01T00:00:00.000Z' } : f,
      ),
      { boatId: 'boat_1', rigId: 'rig_1' },
    );
    expect(pick?.id).toBe('b');
  });
});
