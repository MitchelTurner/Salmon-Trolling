/**
 * Calibration BullMQ job payload + runner (07-probe.md).
 * Idempotent: same sample set + scope → same fit params (within grid).
 */

import {
  fitBallCd,
  type CalibrationFitResult,
  type CalibrationSample,
  type FitScope,
} from '@troll/engine';
import { QUEUE_NAMES } from '../queues/names.js';

export const CALIBRATION_QUEUE = QUEUE_NAMES.calibration;

export type CalibrationJobData = {
  readonly scope: FitScope;
  readonly boatId?: string;
  readonly rigId?: string;
  readonly samples: readonly CalibrationSample[];
};

export type CalibrationJobResult = CalibrationFitResult & {
  readonly jobId: string;
  readonly fittedAt: string;
};

export function runCalibrationJob(
  data: CalibrationJobData,
  jobId: string,
): CalibrationJobResult {
  const fit = fitBallCd(data.samples, {
    scope: data.scope,
    boatId: data.boatId,
    rigId: data.rigId,
  });
  return {
    ...fit,
    jobId,
    fittedAt: new Date().toISOString(),
  };
}
