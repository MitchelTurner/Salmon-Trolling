import { Inject, Injectable } from '@nestjs/common';
import type { CalibrationSample, FitScope } from '@troll/engine';
import { runCalibrationJob } from './calibration.job.js';
import {
  type CalibrationFitStore,
  type StoredFit,
} from './calibration.store.js';

export const CALIBRATION_FIT_STORE = Symbol('CALIBRATION_FIT_STORE');

@Injectable()
export class CalibrationService {
  constructor(
    @Inject(CALIBRATION_FIT_STORE)
    private readonly store: CalibrationFitStore,
  ) {}

  async runAndStore(input: {
    scope: FitScope;
    boatId?: string;
    rigId?: string;
    samples: readonly CalibrationSample[];
    jobId?: string;
  }): Promise<StoredFit> {
    const result = runCalibrationJob(
      {
        scope: input.scope,
        boatId: input.boatId,
        rigId: input.rigId,
        samples: input.samples,
      },
      input.jobId ?? `manual_${Date.now()}`,
    );
    return this.store.save(result, result.fittedAt);
  }

  listActive(filter?: {
    boatId?: string;
    rigId?: string;
  }): Promise<StoredFit[]> {
    return this.store.listActive(filter);
  }
}
