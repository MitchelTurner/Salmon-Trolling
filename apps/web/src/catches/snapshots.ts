import {
  computeCalculator,
  type CalculatorResult,
} from '../routes/calculator/useCalculator.js';
import {
  DEFAULT_INPUTS,
  type CalculatorInputs,
} from '../routes/calculator/types.js';
import { speedInputValue } from '../format/index.js';
import type { PositionSample } from '../trips/types.js';

/** Build a JSON-safe rig snapshot from calculator inputs (frozen at catch time). */
export function buildRigSnapshot(
  inputs: CalculatorInputs,
): Record<string, unknown> {
  return {
    delivery: inputs.delivery,
    stwMode: inputs.stwMode,
    speedDisplay: inputs.speedDisplay,
    cableOutFt: inputs.cableOutFt,
    ballWeightLb: inputs.ballWeightLb,
    ballShape: inputs.ballShape,
    cableDiaIn: inputs.cableDiaIn,
    terminalDragN: inputs.terminalDragN,
    releaseDropFt: inputs.releaseDropFt,
    leaderLengthFt: inputs.leaderLengthFt,
    diverModel: inputs.diverModel,
    diverSize: inputs.diverSize,
    diverSetting: inputs.diverSetting,
    diverLineOutFt: inputs.diverLineOutFt,
    colorsOut: inputs.colorsOut,
    wireOutFt: inputs.wireOutFt,
    weightLb: inputs.weightLb,
    lineOutFt: inputs.lineOutFt,
    lineDiaIn: inputs.lineDiaIn,
  };
}

export function buildDepthSnapshot(
  result: CalculatorResult,
): Record<string, unknown> {
  return {
    depthM: result.depthM,
    setbackM: result.setbackM,
    ballDepthM: result.ballDepthM,
    blowbackDeg: result.blowbackDeg,
    sigmaM: result.sigmaM,
    wide: result.wide,
    confidence: result.confidence,
    stwSource: result.stwSource,
    outOfRange: result.outOfRange,
    assumptions: [...result.assumptions],
    error: result.error,
  };
}

/**
 * Snapshot rig + depth at the catch moment using the active calculator inputs
 * and the live boat speed when available.
 */
export function snapshotAtCatch(args: {
  rigInputs: CalculatorInputs;
  position: PositionSample | null;
}): {
  rigSnapshot: Record<string, unknown>;
  depthSnapshot: Record<string, unknown>;
} {
  const inputs: CalculatorInputs = {
    ...args.rigInputs,
    speedDisplay:
      args.position?.sogMs != null
        ? speedInputValue(args.position.sogMs)
        : args.rigInputs.speedDisplay,
    stwMode:
      args.position?.stwMs != null ? 'paddle_wheel' : args.rigInputs.stwMode,
  };

  if (args.position?.stwMs != null) {
    inputs.speedDisplay = speedInputValue(args.position.stwMs);
  }

  const depth = computeCalculator(inputs);
  return {
    rigSnapshot: buildRigSnapshot(inputs),
    depthSnapshot: buildDepthSnapshot(depth),
  };
}

export function defaultRigInputs(): CalculatorInputs {
  return { ...DEFAULT_INPUTS };
}
