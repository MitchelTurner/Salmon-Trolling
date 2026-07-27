import { useMemo } from 'react';
import {
  RHO_STEEL,
  composeSigma,
  kgPerM,
  lurePositionFromBall,
  resolveStw,
  solveDownrigger,
  solveDiver,
  solveFlatline,
  solveLeadcore,
  solveLeader,
  solveWeighted,
  solveWire,
  type StwConfidence,
  type StwSource,
} from '@troll/engine';
import {
  meters,
  metersPerSecond,
  newtons,
  pounds,
  poundsToKilograms,
  type Meters,
} from '@troll/units';
import { parseLengthInput, parseSpeedInput } from '../../format/index.js';
import type { CalculatorInputs } from './types.js';

const INCH_TO_METERS = 0.0254;
const RHO_MONOFILAMENT = 1140;
/** Default mono leader diameter when not collected in the UI (ESTIMATED). */
const DEFAULT_LEADER_DIA_M = 0.00045;
/** Default attractor drag for leader geometry when not separate from terminal (N). */
const DEFAULT_ATTRACTOR_DRAG_N = 5;

export type CalculatorResult = {
  readonly depthM: number;
  readonly setbackM: number;
  readonly ballDepthM?: number;
  readonly blowbackDeg?: number;
  readonly sigmaM: number;
  readonly wide: boolean;
  readonly confidence: StwConfidence;
  readonly stwSource: StwSource;
  readonly outOfRange: boolean;
  readonly assumptions: string[];
  readonly error?: string;
};

function steelLinearMass(diameterM: number) {
  return kgPerM(Math.PI * (diameterM / 2) ** 2 * RHO_STEEL);
}

function monoLinearMass(diameterM: number) {
  return kgPerM(Math.PI * (diameterM / 2) ** 2 * RHO_MONOFILAMENT);
}

function emptyResult(
  partial: Partial<CalculatorResult> & { error: string },
): CalculatorResult {
  return {
    depthM: 0,
    setbackM: 0,
    sigmaM: 0,
    wide: true,
    confidence: 'modelled',
    stwSource: 'bare_sog',
    outOfRange: false,
    assumptions: [],
    ...partial,
  };
}

function resolveSpeed(inputs: CalculatorInputs) {
  const speedMs = metersPerSecond(parseSpeedInput(inputs.speedDisplay));
  if (inputs.stwMode === 'paddle_wheel') {
    return resolveStw({ speedThroughWater: speedMs });
  }
  return resolveStw({ sog: speedMs });
}

function depthWithUncertainty(args: {
  depth: Meters;
  setback: Meters;
  ballDepth?: Meters;
  blowbackRad?: number;
  stw: ReturnType<typeof resolveStw>;
  depthAtStw: (stwMs: number) => number;
  fitRmse?: Meters;
  outOfRange?: boolean;
  assumptions: string[];
}): CalculatorResult {
  const sigma = composeSigma({
    depth: args.depth,
    stw: args.stw.stw,
    stwSource: args.stw.source,
    depthAtStw: args.depthAtStw,
    fitRmse: args.fitRmse,
  });

  return {
    depthM: args.depth,
    setbackM: args.setback,
    ballDepthM: args.ballDepth,
    blowbackDeg:
      args.blowbackRad !== undefined
        ? (args.blowbackRad * 180) / Math.PI
        : undefined,
    sigmaM: sigma.sigma,
    wide: sigma.wide,
    confidence: args.stw.confidence,
    stwSource: args.stw.source,
    outOfRange: args.outOfRange ?? false,
    assumptions: [...args.stw.assumptions, ...args.assumptions],
  };
}

export function computeCalculator(inputs: CalculatorInputs): CalculatorResult {
  try {
    const stwResolved = resolveSpeed(inputs);
    const stw = stwResolved.stw;

    switch (inputs.delivery) {
      case 'DOWNRIGGER': {
        const cableOut = meters(parseLengthInput(inputs.cableOutFt));
        const diameter = meters(Number(inputs.cableDiaIn) * INCH_TO_METERS);
        const terminalDrag = newtons(Number(inputs.terminalDragN) || 0);
        const releaseDrop = meters(parseLengthInput(inputs.releaseDropFt));
        const leaderLength = meters(parseLengthInput(inputs.leaderLengthFt));
        const ballMass = poundsToKilograms(
          pounds(Number(inputs.ballWeightLb) || 0),
        );

        const run = (stwMs: number) => {
          const stwVal = metersPerSecond(stwMs);
          const ball = solveDownrigger({
            cableOut,
            stw: stwVal,
            ball: { mass: ballMass, shape: inputs.ballShape },
            cable: {
              diameter,
              linearMass: steelLinearMass(diameter),
            },
            terminalDrag,
          });
          const leader = solveLeader({
            leaderLength,
            stw: stwVal,
            leader: { diameter: meters(DEFAULT_LEADER_DIA_M) },
            attractorDrag: newtons(DEFAULT_ATTRACTOR_DRAG_N),
          });
          const lure = lurePositionFromBall({
            ballDepth: ball.ballDepth,
            ballSetback: ball.setback,
            releaseDropHeight: releaseDrop,
            leader,
          });
          return { ball, leader, lure };
        };

        const { ball, leader, lure } = run(stw);
        return depthWithUncertainty({
          depth: lure.lureDepth,
          setback: lure.lureSetback,
          ballDepth: ball.ballDepth,
          blowbackRad: ball.blowbackAngle,
          stw: stwResolved,
          depthAtStw: (stwMs) => run(stwMs).lure.lureDepth,
          assumptions: [
            ...ball.assumptions,
            ...leader.assumptions,
            `leader diameter default ${DEFAULT_LEADER_DIA_M} m (not collected in UI)`,
            `attractor drag default ${DEFAULT_ATTRACTOR_DRAG_N} N (not collected in UI)`,
          ],
        });
      }

      case 'DIVER': {
        const lineOut = meters(parseLengthInput(inputs.diverLineOutFt));
        const settingIndex = Number(inputs.diverSetting);
        if (!Number.isFinite(settingIndex)) {
          return emptyResult({ error: 'diver setting must be a number' });
        }

        const run = (stwMs: number) =>
          solveDiver({
            model: inputs.diverModel,
            size: inputs.diverSize,
            settingIndex,
            lineOut,
            stw: metersPerSecond(stwMs),
          });

        const result = run(stw);
        return depthWithUncertainty({
          depth: result.depth,
          setback: meters(0),
          stw: stwResolved,
          depthAtStw: (stwMs) => run(stwMs).depth,
          fitRmse: meters(result.fit.rmseM),
          outOfRange: result.outOfRange,
          assumptions: result.assumptions,
        });
      }

      case 'LEADCORE': {
        const colorsOut = Number(inputs.colorsOut);
        if (!Number.isFinite(colorsOut) || colorsOut < 0) {
          return emptyResult({ error: 'colors out must be a non-negative number' });
        }
        if (stw <= 0) {
          return emptyResult({
            error: 'speed must be > 0 for leadcore',
            assumptions: stwResolved.assumptions,
            confidence: stwResolved.confidence,
            stwSource: stwResolved.source,
          });
        }

        const run = (stwMs: number) =>
          solveLeadcore({
            colorsOut,
            stw: metersPerSecond(stwMs),
          });
        const result = run(stw);
        return depthWithUncertainty({
          depth: result.depth,
          setback: meters(0),
          stw: stwResolved,
          depthAtStw: (stwMs) => run(stwMs).depth,
          assumptions: result.assumptions,
        });
      }

      case 'WIRE': {
        const wireOut = meters(parseLengthInput(inputs.wireOutFt));
        if (stw <= 0) {
          return emptyResult({
            error: 'speed must be > 0 for wire',
            assumptions: stwResolved.assumptions,
            confidence: stwResolved.confidence,
            stwSource: stwResolved.source,
          });
        }

        const run = (stwMs: number) =>
          solveWire({
            colorsOut: 0,
            wireOut,
            stw: metersPerSecond(stwMs),
          });
        const result = run(stw);
        return depthWithUncertainty({
          depth: result.depth,
          setback: meters(0),
          stw: stwResolved,
          depthAtStw: (stwMs) => run(stwMs).depth,
          assumptions: result.assumptions,
        });
      }

      case 'WEIGHTED': {
        const lineOut = meters(parseLengthInput(inputs.lineOutFt));
        const diameter = meters(Number(inputs.lineDiaIn) * INCH_TO_METERS);
        const tipMass = poundsToKilograms(pounds(Number(inputs.weightLb) || 0));
        const terminalDrag = newtons(Number(inputs.terminalDragN) || 0);

        const run = (stwMs: number) =>
          solveWeighted({
            lineOut,
            stw: metersPerSecond(stwMs),
            weight: { mass: tipMass, shape: 'sphere' },
            line: {
              diameter,
              linearMass: monoLinearMass(diameter),
            },
            terminalDrag,
          });
        const result = run(stw);
        return depthWithUncertainty({
          depth: result.depth,
          setback: result.setback,
          blowbackRad: result.blowbackAngle,
          stw: stwResolved,
          depthAtStw: (stwMs) => run(stwMs).depth,
          assumptions: result.assumptions,
        });
      }

      case 'FLATLINE': {
        const lineOut = meters(parseLengthInput(inputs.lineOutFt));
        const diameter = meters(Number(inputs.lineDiaIn) * INCH_TO_METERS);
        const terminalDrag = newtons(Number(inputs.terminalDragN) || 0);

        const run = (stwMs: number) =>
          solveFlatline({
            lineOut,
            stw: metersPerSecond(stwMs),
            line: {
              diameter,
              linearMass: monoLinearMass(diameter),
            },
            terminalDrag,
          });
        const result = run(stw);
        return depthWithUncertainty({
          depth: result.depth,
          setback: result.setback,
          blowbackRad: result.blowbackAngle,
          stw: stwResolved,
          depthAtStw: (stwMs) => run(stwMs).depth,
          assumptions: result.assumptions,
        });
      }
    }
  } catch (err) {
    return emptyResult({
      error: err instanceof Error ? err.message : 'calculation failed',
    });
  }
}

/** Live recompute on every input change. */
export function useCalculator(inputs: CalculatorInputs): CalculatorResult {
  return useMemo(() => computeCalculator(inputs), [inputs]);
}
