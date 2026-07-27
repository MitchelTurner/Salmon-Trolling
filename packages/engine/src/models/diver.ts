/**
 * Model B — diving planers (curve fit from manufacturer charts).
 * Spec: docs/02-depth-engine.md
 */
import { meters, type Meters, type MetersPerSecond } from '@troll/units';
import {
  evaluateDiverFit,
  findDiverChart,
  isDiverOutOfRange,
  type DiverChart,
  type DiverFitParams,
} from '../data/divers.js';
import { V_REF } from './v-ref.js';

export type SolveDiverInput = {
  readonly model: string;
  readonly size: string;
  readonly settingIndex: number;
  readonly lineOut: Meters;
  readonly stw: MetersPerSecond;
  readonly lineType?: string;
  readonly lineDiameterM?: number;
  readonly addedWeightKg?: number;
  /** Override when injecting a chart in tests. */
  readonly chart?: DiverChart;
};

export type SolveDiverResult = {
  readonly depth: Meters;
  readonly outOfRange: boolean;
  readonly fit: DiverFitParams;
  readonly assumptions: string[];
};

export function solveDiver(input: SolveDiverInput): SolveDiverResult {
  if (input.lineOut < 0) {
    throw new Error('lineOut must be >= 0');
  }
  if (input.stw < 0) {
    throw new Error('stw must be >= 0');
  }

  const chart =
    input.chart ??
    findDiverChart({
      model: input.model,
      size: input.size,
      settingIndex: input.settingIndex,
      lineType: input.lineType,
      lineDiameterM: input.lineDiameterM,
      addedWeightKg: input.addedWeightKg,
    });

  if (!chart) {
    throw new Error(
      `no diver chart for ${input.model}/${input.size}/setting ${input.settingIndex}`,
    );
  }

  const depthM = evaluateDiverFit(chart.fit, input.lineOut, input.stw, V_REF);
  const outOfRange = isDiverOutOfRange(chart.fit, input.lineOut, input.stw);

  const assumptions = [
    `diver fit from ${chart.tag} chart (${chart.sourceUrl})`,
    `fit k=${chart.fit.k.toFixed(4)} α=${chart.fit.alpha.toFixed(3)} β=${chart.fit.beta.toFixed(3)} rmse=${chart.fit.rmseM.toFixed(3)} m`,
    `domain lineOut=[${chart.fit.lineOutMinM}, ${chart.fit.lineOutMaxM}] m stw=[${chart.fit.stwMinMs.toFixed(3)}, ${chart.fit.stwMaxMs.toFixed(3)}] m/s`,
  ];
  if (outOfRange) {
    assumptions.push(
      'outOfRange: lineOut or STW outside the fitted manufacturer chart domain',
    );
  }

  return {
    depth: meters(depthM),
    outOfRange,
    fit: chart.fit,
    assumptions,
  };
}
