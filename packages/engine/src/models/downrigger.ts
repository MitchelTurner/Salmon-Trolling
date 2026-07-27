/**
 * Model A — segmented towed-cable downrigger integration.
 * Spec: docs/02-depth-engine.md
 *
 * Coordinate system: x positive astern, z positive downward.
 * θ = 0 is straight down; θ → π/2 is laid out flat.
 *
 * Force model matches the spec exactly (normal-velocity term v·cos θ and the
 * upward component of normal drag −D_n·sin θ). Integration is shared with
 * weighted / flatline via {@link integrateTowedCable}.
 */
import {
  kilograms,
  meters,
  metersPerSecond,
  newtons,
  radians,
  type Brand,
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
  RHO_STEEL,
  type ProvenanceTag,
} from '../constants.js';
import { integrateTowedCable } from './towed-cable.js';

/** Linear density, kg/m. */
export type KgPerM = Brand<number, 'KgPerM'>;

/** Area, m². */
export type SquareMeters = Brand<number, 'SquareMeters'>;

export type BallShape = 'sphere' | 'pancake' | 'torpedo';

export type DownriggerBall = {
  readonly mass: Kilograms;
  readonly shape: BallShape;
  /** Override shape-default Cd when measured/fitted. */
  readonly cd?: number;
  /** Provenance for an overridden Cd. Defaults to MEASURED when cd is set. */
  readonly cdSource?: ProvenanceTag | 'FITTED';
};

export type DownriggerCable = {
  readonly diameter: Meters;
  readonly linearMass: KgPerM;
};

export type SolveDownriggerInput = {
  readonly cableOut: Meters;
  readonly stw: MetersPerSecond;
  readonly ball: DownriggerBall;
  readonly cable: DownriggerCable;
  readonly terminalDrag: Newtons;
  readonly segments?: number;
};

export type SolveDownriggerResult = {
  readonly ballDepth: Meters;
  readonly setback: Meters;
  readonly blowbackAngle: Radians;
  /** Diagnostics used by sanity-anchor tests; not a public API contract. */
  readonly diagnostics: {
    readonly ballSubmergedWeight: Newtons;
    readonly ballDrag: Newtons;
    readonly totalCableNormalDrag: Newtons;
    readonly frontalArea: SquareMeters;
    readonly cd: number;
  };
  readonly assumptions: string[];
};

export function kgPerM(value: number): KgPerM {
  return value as KgPerM;
}

export function squareMeters(value: number): SquareMeters {
  return value as SquareMeters;
}

function defaultCd(shape: BallShape): number {
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
 * Frontal area from ball mass and shape, assuming solid lead density.
 * Pancake/torpedo use geometric idealizations stated in assumptions.
 */
export function frontalArea(
  mass: Kilograms,
  shape: BallShape,
): { area: SquareMeters; assumptions: string[] } {
  const volume = mass / RHO_LEAD;
  const assumptions: string[] = [];

  switch (shape) {
    case 'sphere': {
      const radius = Math.cbrt((3 * volume) / (4 * Math.PI));
      return { area: squareMeters(Math.PI * radius * radius), assumptions };
    }
    case 'pancake': {
      assumptions.push(
        'pancake frontal area assumes thickness = 0.2×diameter (ESTIMATED geometry)',
      );
      const diameter = Math.cbrt((4 * volume) / (0.2 * Math.PI));
      const radius = diameter / 2;
      return { area: squareMeters(Math.PI * radius * radius), assumptions };
    }
    case 'torpedo': {
      assumptions.push(
        'torpedo frontal area assumes L/D = 4 cylinder (ESTIMATED geometry)',
      );
      const diameter = Math.cbrt(volume / Math.PI);
      const radius = diameter / 2;
      return { area: squareMeters(Math.PI * radius * radius), assumptions };
    }
  }
}

const ESTIMATED_VALUES = {
  CD_CYL_NORMAL,
  CD_CYL_TANGENT,
  CD_PANCAKE,
  CD_TORPEDO,
} as const;

function collectEstimatedAssumptions(
  names: ReadonlyArray<keyof typeof ESTIMATED_VALUES>,
): string[] {
  const out: string[] = [];
  for (const name of names) {
    const provenance = CONSTANT_PROVENANCE[name];
    if (provenance.tag !== 'ESTIMATED') continue;
    out.push(
      `${name}=${ESTIMATED_VALUES[name]} (${provenance.tag} ${provenance.uncertainty}; ${provenance.source})`,
    );
  }
  return out;
}

/**
 * Integrate from the ball upward along the cable, accumulating hydrodynamic drag
 * segment by segment. Includes the normal-velocity term (v·cos θ) and the upward
 * component of normal drag (−D_n·sin θ).
 */
export function solveDownrigger(
  input: SolveDownriggerInput,
): SolveDownriggerResult {
  const segments = input.segments ?? 200;
  if (input.cableOut < 0) {
    throw new Error('cableOut must be >= 0');
  }
  if (input.stw < 0) {
    throw new Error('stw must be >= 0');
  }

  const cd = input.ball.cd ?? defaultCd(input.ball.shape);
  const { area, assumptions: areaAssumptions } = frontalArea(
    input.ball.mass,
    input.ball.shape,
  );

  const ballSubmergedWeightN =
    input.ball.mass * (1 - RHO_SEAWATER / RHO_LEAD) * G;
  const ballDragN =
    0.5 * RHO_SEAWATER * cd * area * input.stw * input.stw;
  const wCableNpm =
    input.cable.linearMass * (1 - RHO_SEAWATER / RHO_STEEL) * G;

  const integrated = integrateTowedCable({
    lengthM: input.cableOut,
    stwMs: input.stw,
    tipWeightN: ballSubmergedWeightN,
    tipDragN: ballDragN,
    terminalDragN: input.terminalDrag,
    diameterM: input.cable.diameter,
    wCableNpm,
    segments,
  });

  const cdTag: ProvenanceTag | 'FITTED' =
    input.ball.cd !== undefined
      ? (input.ball.cdSource ?? 'MEASURED')
      : input.ball.shape === 'sphere'
        ? 'MANUFACTURER'
        : 'ESTIMATED';

  const estimatedNames: Array<keyof typeof ESTIMATED_VALUES> = [
    'CD_CYL_NORMAL',
    'CD_CYL_TANGENT',
  ];
  if (input.ball.cd === undefined && input.ball.shape === 'pancake') {
    estimatedNames.push('CD_PANCAKE');
  }
  if (input.ball.cd === undefined && input.ball.shape === 'torpedo') {
    estimatedNames.push('CD_TORPEDO');
  }

  const assumptions = [
    ...areaAssumptions,
    ...collectEstimatedAssumptions(estimatedNames),
    `ball Cd=${cd} (${cdTag})`,
    `terminalDrag=${input.terminalDrag} N`,
  ];

  return {
    ballDepth: meters(integrated.depthM),
    setback: meters(integrated.setbackM),
    blowbackAngle: radians(integrated.blowbackAngleRad),
    diagnostics: {
      ballSubmergedWeight: newtons(ballSubmergedWeightN),
      ballDrag: newtons(ballDragN),
      totalCableNormalDrag: newtons(integrated.totalCableNormalDragN),
      frontalArea: area,
      cd,
    },
    assumptions,
  };
}

/** Convenience builders for tests and callers assembling SI inputs. */
export const downriggerInputs = {
  kilograms,
  meters,
  metersPerSecond,
  newtons,
  kgPerM,
};
