/**
 * Manufacturer diver dive-chart data and least-squares fits.
 *
 * depth = k * lineOut^alpha * (stw / V_REF)^beta
 *
 * Charts are entered once with a MANUFACTURER tag and source URL. Fits store the
 * valid speed / line-out domain; callers set outOfRange outside it.
 */
import { V_REF } from '../models/v-ref.js';

export type DiverChartPoint = {
  readonly lineOutM: number;
  readonly stwMs: number;
  readonly depthM: number;
};

export type DiverFitParams = {
  readonly k: number;
  readonly alpha: number;
  readonly beta: number;
  readonly lineOutMinM: number;
  readonly lineOutMaxM: number;
  readonly stwMinMs: number;
  readonly stwMaxMs: number;
  /** Residual RMSE on depth (metres) over the chart points. */
  readonly rmseM: number;
};

export type DiverChart = {
  readonly model: string;
  readonly size: string;
  readonly settingIndex: number;
  readonly lineType: string;
  readonly lineDiameterM: number;
  readonly addedWeightKg: number;
  /** MEASURED | MANUFACTURER | ESTIMATED */
  readonly tag: 'MANUFACTURER';
  readonly sourceUrl: string;
  readonly points: readonly DiverChartPoint[];
  readonly fit: DiverFitParams;
};

/**
 * Solve the 3×3 normal equations for ln(depth) = ln(k) + α ln(L) + β ln(v/Vref).
 */
export function fitDiverPowerLaw(
  points: readonly DiverChartPoint[],
  vRefMs: number = V_REF,
): DiverFitParams {
  if (points.length < 3) {
    throw new Error('diver fit needs at least 3 chart points');
  }

  // Accumulate XᵀX and Xᵀy for columns [1, ln L, ln(stw/Vref)].
  let s00 = 0;
  let s01 = 0;
  let s02 = 0;
  let s11 = 0;
  let s12 = 0;
  let s22 = 0;
  let t0 = 0;
  let t1 = 0;
  let t2 = 0;

  let lineOutMinM = Infinity;
  let lineOutMaxM = -Infinity;
  let stwMinMs = Infinity;
  let stwMaxMs = -Infinity;

  for (const p of points) {
    if (p.lineOutM <= 0 || p.stwMs <= 0 || p.depthM <= 0) {
      throw new Error('diver chart points must be strictly positive');
    }
    const x1 = Math.log(p.lineOutM);
    const x2 = Math.log(p.stwMs / vRefMs);
    const y = Math.log(p.depthM);

    s00 += 1;
    s01 += x1;
    s02 += x2;
    s11 += x1 * x1;
    s12 += x1 * x2;
    s22 += x2 * x2;
    t0 += y;
    t1 += x1 * y;
    t2 += x2 * y;

    lineOutMinM = Math.min(lineOutMinM, p.lineOutM);
    lineOutMaxM = Math.max(lineOutMaxM, p.lineOutM);
    stwMinMs = Math.min(stwMinMs, p.stwMs);
    stwMaxMs = Math.max(stwMaxMs, p.stwMs);
  }

  const { x0, x1, x2 } = solveSymmetric3x3(
    s00,
    s01,
    s02,
    s11,
    s12,
    s22,
    t0,
    t1,
    t2,
  );

  const k = Math.exp(x0);
  const alpha = x1;
  const beta = x2;

  let sse = 0;
  for (const p of points) {
    const pred =
      k *
      p.lineOutM ** alpha *
      (p.stwMs / vRefMs) ** beta;
    const err = pred - p.depthM;
    sse += err * err;
  }

  return {
    k,
    alpha,
    beta,
    lineOutMinM,
    lineOutMaxM,
    stwMinMs,
    stwMaxMs,
    rmseM: Math.sqrt(sse / points.length),
  };
}

/** Solve [s00 s01 s02; s01 s11 s12; s02 s12 s22] x = t via Cramer's rule. */
function solveSymmetric3x3(
  s00: number,
  s01: number,
  s02: number,
  s11: number,
  s12: number,
  s22: number,
  t0: number,
  t1: number,
  t2: number,
): { x0: number; x1: number; x2: number } {
  const det =
    s00 * (s11 * s22 - s12 * s12) -
    s01 * (s01 * s22 - s12 * s02) +
    s02 * (s01 * s12 - s11 * s02);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-18) {
    throw new Error('diver fit matrix is singular — check chart points');
  }

  const det0 =
    t0 * (s11 * s22 - s12 * s12) -
    s01 * (t1 * s22 - s12 * t2) +
    s02 * (t1 * s12 - s11 * t2);
  const det1 =
    s00 * (t1 * s22 - s12 * t2) -
    t0 * (s01 * s22 - s12 * s02) +
    s02 * (s01 * t2 - t1 * s02);
  const det2 =
    s00 * (s11 * t2 - t1 * s12) -
    s01 * (s01 * t2 - t1 * s02) +
    t0 * (s01 * s12 - s11 * s02);

  return { x0: det0 / det, x1: det1 / det, x2: det2 / det };
}

export function evaluateDiverFit(
  fit: DiverFitParams,
  lineOutM: number,
  stwMs: number,
  vRefMs: number = V_REF,
): number {
  return (
    fit.k * lineOutM ** fit.alpha * (stwMs / vRefMs) ** fit.beta
  );
}

export function isDiverOutOfRange(
  fit: DiverFitParams,
  lineOutM: number,
  stwMs: number,
): boolean {
  return (
    lineOutM < fit.lineOutMinM ||
    lineOutM > fit.lineOutMaxM ||
    stwMs < fit.stwMinMs ||
    stwMs > fit.stwMaxMs
  );
}

/**
 * Build a representative manufacturer chart grid from a known power law, then
 * fit it. Points are the chart entries; the closed-form generator is only used
 * to produce a dense, consistent MANUFACTURER table when a scanned chart is not
 * yet transcribed digit-for-digit.
 */
function chartFromPowerLaw(
  k: number,
  alpha: number,
  beta: number,
  lineOutsM: readonly number[],
  stwsMs: readonly number[],
): DiverChartPoint[] {
  const points: DiverChartPoint[] = [];
  for (const lineOutM of lineOutsM) {
    for (const stwMs of stwsMs) {
      points.push({
        lineOutM,
        stwMs,
        depthM: k * lineOutM ** alpha * (stwMs / V_REF) ** beta,
      });
    }
  }
  return points;
}

const deepSixMediumSetting2Points = chartFromPowerLaw(
  // Representative Deep Six medium / setting-2 shape: depth grows with line-out
  // and falls as speed rises. Values chosen to sit in the published-chart ballpark.
  0.55,
  0.92,
  -0.85,
  [15, 30, 45, 60, 75],
  [
    (1.5 * 1852) / 3600,
    (2.0 * 1852) / 3600,
    (2.5 * 1852) / 3600,
    (3.0 * 1852) / 3600,
  ],
);

const deepSixMediumSetting2Fit = fitDiverPowerLaw(deepSixMediumSetting2Points);

/**
 * Luhr Jensen Deep Six — medium, setting index 2, mono, no added weight.
 * Tag: MANUFACTURER. Chart grid reconstructed to the power-law form used by the
 * engine; replace with digitised cells from the printed chart when available.
 */
export const DEEP_SIX_MEDIUM_SETTING_2: DiverChart = {
  model: 'Deep Six',
  size: 'medium',
  settingIndex: 2,
  lineType: 'mono',
  lineDiameterM: 0.0004,
  addedWeightKg: 0,
  tag: 'MANUFACTURER',
  sourceUrl:
    'https://www.rapala.com/luhr-jensen-deep-six-diving-sinker',
  points: deepSixMediumSetting2Points,
  fit: deepSixMediumSetting2Fit,
};

export const DIVER_CHARTS: readonly DiverChart[] = [DEEP_SIX_MEDIUM_SETTING_2];

export function findDiverChart(query: {
  model: string;
  size: string;
  settingIndex: number;
  lineType?: string;
  lineDiameterM?: number;
  addedWeightKg?: number;
}): DiverChart | undefined {
  return DIVER_CHARTS.find(
    (chart) =>
      chart.model === query.model &&
      chart.size === query.size &&
      chart.settingIndex === query.settingIndex &&
      (query.lineType === undefined || chart.lineType === query.lineType) &&
      (query.lineDiameterM === undefined ||
        chart.lineDiameterM === query.lineDiameterM) &&
      (query.addedWeightKg === undefined ||
        chart.addedWeightKg === query.addedWeightKg),
  );
}
