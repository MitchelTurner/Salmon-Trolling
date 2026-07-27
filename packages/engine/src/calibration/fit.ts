/**
 * Probe calibration fitting (07-probe.md).
 * Fit ball Cd by minimizing RMSE vs measured depth from solveDownrigger.
 */

import {
  kilograms,
  meters,
  metersPerSecond,
  newtons,
} from '@troll/units';
import {
  kgPerM,
  solveDownrigger,
  type BallShape,
} from '../models/downrigger.js';

export type FitScope = 'GLOBAL' | 'BOAT' | 'RIG';

export type CalibrationSample = {
  readonly measuredDepthM: number;
  readonly cableOutM: number;
  readonly stwMs: number;
  readonly ballMassKg: number;
  readonly ballShape: BallShape;
  readonly cableDiameterM: number;
  readonly cableLinearMassKgPerM: number;
  readonly terminalDragN: number;
};

export type CalibrationFitResult = {
  readonly scope: FitScope;
  readonly boatId?: string;
  readonly rigId?: string;
  /** Fitted coefficients keyed by constant name. */
  readonly params: { readonly ballCd: number };
  readonly rmseM: number;
  readonly sampleN: number;
};

export type FitBallCdOptions = {
  readonly scope: FitScope;
  readonly boatId?: string;
  readonly rigId?: string;
  /** Cd search bounds. */
  readonly cdMin?: number;
  readonly cdMax?: number;
  readonly steps?: number;
  readonly segments?: number;
};

function rmseForCd(
  samples: readonly CalibrationSample[],
  cd: number,
  segments: number,
): number {
  let sumSq = 0;
  for (const s of samples) {
    const result = solveDownrigger({
      cableOut: meters(s.cableOutM),
      stw: metersPerSecond(s.stwMs),
      ball: {
        mass: kilograms(s.ballMassKg),
        shape: s.ballShape,
        cd,
      },
      cable: {
        diameter: meters(s.cableDiameterM),
        linearMass: kgPerM(s.cableLinearMassKgPerM),
      },
      terminalDrag: newtons(s.terminalDragN),
      segments,
    });
    const err = Number(result.ballDepth) - s.measuredDepthM;
    sumSq += err * err;
  }
  return Math.sqrt(sumSq / samples.length);
}

/**
 * Grid-search ball Cd to minimize depth RMSE.
 * Small tabular search is enough for v1 probe data volumes.
 */
export function fitBallCd(
  samples: readonly CalibrationSample[],
  options: FitBallCdOptions,
): CalibrationFitResult {
  if (samples.length === 0) {
    throw new Error('fitBallCd requires at least one sample');
  }
  if (options.scope === 'BOAT' && !options.boatId) {
    throw new Error('BOAT scope requires boatId');
  }
  if (options.scope === 'RIG' && !options.rigId) {
    throw new Error('RIG scope requires rigId');
  }

  const cdMin = options.cdMin ?? 0.2;
  const cdMax = options.cdMax ?? 1.4;
  const steps = options.steps ?? 49;
  const segments = options.segments ?? 80;

  let bestCd = cdMin;
  let bestRmse = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= steps; i++) {
    const cd = cdMin + ((cdMax - cdMin) * i) / steps;
    const rmse = rmseForCd(samples, cd, segments);
    if (rmse < bestRmse) {
      bestRmse = rmse;
      bestCd = cd;
    }
  }

  return {
    scope: options.scope,
    boatId: options.boatId,
    rigId: options.rigId,
    params: { ballCd: bestCd },
    rmseM: bestRmse,
    sampleN: samples.length,
  };
}

const SCOPE_RANK: Record<FitScope, number> = {
  RIG: 3,
  BOAT: 2,
  GLOBAL: 1,
};

export type StoredCalibrationFit = {
  readonly id: string;
  readonly scope: FitScope;
  readonly boatId?: string;
  readonly rigId?: string;
  readonly params: { readonly ballCd: number };
  readonly rmseM: number;
  readonly sampleN: number;
  readonly fittedAt: string;
  readonly supersededAt?: string;
};

/**
 * Prefer the narrowest active fit for the current boat/rig.
 * RIG > BOAT > GLOBAL. Superseded fits are ignored.
 */
export function selectNarrowestFit(
  fits: readonly StoredCalibrationFit[],
  ctx: { boatId?: string; rigId?: string },
): StoredCalibrationFit | null {
  const active = fits.filter((f) => f.supersededAt == null);
  const eligible = active.filter((f) => {
    if (f.scope === 'GLOBAL') return true;
    if (f.scope === 'BOAT') return f.boatId != null && f.boatId === ctx.boatId;
    if (f.scope === 'RIG') return f.rigId != null && f.rigId === ctx.rigId;
    return false;
  });
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope]);
  return eligible[0] ?? null;
}

/** Assumption line when a fitted Cd is applied. */
export function fittedCdAssumption(fit: StoredCalibrationFit): string {
  const where =
    fit.scope === 'RIG'
      ? `rig ${fit.rigId}`
      : fit.scope === 'BOAT'
        ? `boat ${fit.boatId}`
        : 'global';
  return `ball Cd=${fit.params.ballCd.toFixed(3)} (FITTED ${fit.scope} ${where}; RMSE ${fit.rmseM.toFixed(3)} m; n=${fit.sampleN})`;
}
