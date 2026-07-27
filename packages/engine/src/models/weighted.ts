/**
 * Model D — weighted line and flatline.
 * Spec: docs/02-depth-engine.md
 *
 * Equilibrium between weight and total line drag. Uses the same segmented
 * integration path as the downrigger ({@link integrateTowedCable}) with the
 * sinker substituted for the ball — no separate downrigger cable.
 */
import {
  kilograms,
  meters,
  newtons,
  radians,
  type Kilograms,
  type Meters,
  type MetersPerSecond,
  type Newtons,
  type Radians,
} from '@troll/units';
import {
  CD_CYL_NORMAL,
  CD_CYL_TANGENT,
  CD_PANCAKE,
  CD_SPHERE,
  CD_TORPEDO,
  CONSTANT_PROVENANCE,
  G,
  RHO_LEAD,
  RHO_SEAWATER,
} from '../constants.js';
import {
  frontalArea,
  type BallShape,
  type KgPerM,
} from './downrigger.js';
import { integrateTowedCable } from './towed-cable.js';

/** Nylon monofilament density for mainline buoyancy. ESTIMATED. */
const RHO_MONOFILAMENT = 1140;

export type WeightedTip = {
  readonly mass: Kilograms;
  readonly shape: BallShape;
  readonly cd?: number;
};

export type WeightedLine = {
  readonly diameter: Meters;
  readonly linearMass: KgPerM;
};

export type SolveWeightedInput = {
  readonly lineOut: Meters;
  readonly stw: MetersPerSecond;
  readonly weight: WeightedTip;
  readonly line: WeightedLine;
  readonly terminalDrag?: Newtons;
  readonly segments?: number;
};

export type SolveWeightedResult = {
  readonly depth: Meters;
  readonly setback: Meters;
  readonly blowbackAngle: Radians;
  readonly assumptions: string[];
};

function tipCd(shape: BallShape, override?: number): number {
  if (override !== undefined) return override;
  switch (shape) {
    case 'sphere':
      return CD_SPHERE;
    case 'pancake':
      return CD_PANCAKE;
    case 'torpedo':
      return CD_TORPEDO;
  }
}

/**
 * Weighted line: sinker at the tip, fishing line as the towed cable.
 * Flatline is the zero-weight special case — see {@link solveFlatline}.
 */
export function solveWeighted(input: SolveWeightedInput): SolveWeightedResult {
  const segments = input.segments ?? 200;
  const terminalDrag = input.terminalDrag ?? newtons(0);

  if (input.lineOut < 0) {
    throw new Error('lineOut must be >= 0');
  }
  if (input.stw < 0) {
    throw new Error('stw must be >= 0');
  }

  const { area, assumptions: areaAssumptions } = frontalArea(
    input.weight.mass,
    input.weight.shape,
  );
  const cd = tipCd(input.weight.shape, input.weight.cd);

  const tipWeightN =
    input.weight.mass * (1 - RHO_SEAWATER / RHO_LEAD) * G;
  const tipDragN = 0.5 * RHO_SEAWATER * cd * area * input.stw * input.stw;
  const wCableNpm =
    input.line.linearMass * (1 - RHO_SEAWATER / RHO_MONOFILAMENT) * G;

  const integrated = integrateTowedCable({
    lengthM: input.lineOut,
    stwMs: input.stw,
    tipWeightN,
    tipDragN,
    terminalDragN: terminalDrag,
    diameterM: input.line.diameter,
    wCableNpm,
    segments,
  });

  const assumptions = [
    ...areaAssumptions,
    'weighted/flatline uses shared towed-cable integration (Model A path)',
    `CD_CYL_NORMAL=${CD_CYL_NORMAL} (${CONSTANT_PROVENANCE.CD_CYL_NORMAL.tag})`,
    `CD_CYL_TANGENT=${CD_CYL_TANGENT} (${CONSTANT_PROVENANCE.CD_CYL_TANGENT.tag})`,
    `tip mass=${input.weight.mass} kg shape=${input.weight.shape}`,
    `mainline ρ=${RHO_MONOFILAMENT} kg/m³ (ESTIMATED nylon; TODO(calibrate))`,
  ];

  return {
    depth: meters(integrated.depthM),
    setback: meters(integrated.setbackM),
    blowbackAngle: radians(integrated.blowbackAngleRad),
    assumptions,
  };
}

export type SolveFlatlineInput = {
  readonly lineOut: Meters;
  readonly stw: MetersPerSecond;
  readonly line: WeightedLine;
  readonly terminalDrag?: Newtons;
  readonly segments?: number;
};

/**
 * Flatline: no sinker — same integration with zero tip weight/drag.
 * Depth comes only from line weight and tackle drag.
 */
export function solveFlatline(input: SolveFlatlineInput): SolveWeightedResult {
  const result = solveWeighted({
    lineOut: input.lineOut,
    stw: input.stw,
    weight: { mass: kilograms(0), shape: 'sphere' },
    line: input.line,
    terminalDrag: input.terminalDrag,
    segments: input.segments,
  });
  return {
    ...result,
    assumptions: [...result.assumptions, 'flatline: zero tip weight'],
  };
}
