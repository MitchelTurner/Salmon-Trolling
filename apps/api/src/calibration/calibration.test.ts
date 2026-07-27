import { describe, expect, it } from 'vitest';
import {
  kilograms,
  meters,
  metersPerSecond,
  newtons,
} from '@troll/units';
import { kgPerM, solveDownrigger } from '@troll/engine';
import { runCalibrationJob } from './calibration.job.js';
import { MemoryCalibrationFitStore } from './calibration.store.js';
import { CalibrationService } from './calibration.service.js';

describe('calibration job', () => {
  it('fits Cd and stores RMSE per scope', async () => {
    const planted = 0.7;
    const base = {
      cableOutM: 30.48,
      stwMs: 1.286,
      ballMassKg: 4.5359237,
      ballShape: 'sphere' as const,
      cableDiameterM: 0.001143,
      cableLinearMassKgPerM: 0.00805,
      terminalDragN: 10,
    };
    const depth = Number(
      solveDownrigger({
        cableOut: meters(base.cableOutM),
        stw: metersPerSecond(base.stwMs),
        ball: {
          mass: kilograms(base.ballMassKg),
          shape: 'sphere',
          cd: planted,
        },
        cable: {
          diameter: meters(base.cableDiameterM),
          linearMass: kgPerM(base.cableLinearMassKgPerM),
        },
        terminalDrag: newtons(base.terminalDragN),
        segments: 80,
      }).ballDepth,
    );

    const store = new MemoryCalibrationFitStore();
    const service = new CalibrationService(store);
    const fit = await service.runAndStore({
      scope: 'BOAT',
      boatId: 'boat_1',
      samples: [{ ...base, measuredDepthM: depth }],
      jobId: 'job_1',
    });

    expect(fit.params.ballCd).toBeCloseTo(planted, 1);
    expect(fit.rmseM).toBeLessThan(0.1);
    expect(fit.sampleN).toBe(1);

    const again = runCalibrationJob(
      {
        scope: 'BOAT',
        boatId: 'boat_1',
        samples: [{ ...base, measuredDepthM: depth }],
      },
      'job_2',
    );
    expect(again.params.ballCd).toBeCloseTo(fit.params.ballCd, 5);

    const second = await service.runAndStore({
      scope: 'BOAT',
      boatId: 'boat_1',
      samples: [{ ...base, measuredDepthM: depth }],
    });
    const active = await store.listActive({ boatId: 'boat_1' });
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(second.id);
  });
});
