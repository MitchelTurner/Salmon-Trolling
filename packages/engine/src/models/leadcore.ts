/**
 * Model C — leadcore and wire.
 * Spec: docs/02-depth-engine.md
 *
 * depthPerColor(stw) = c0 * (stw / V_REF)^(-gamma)
 * depth = colorsOut * depthPerColor(stw) + backingSag + leaderRise
 *
 * c0 and gamma start ESTIMATED (folklore: ~5 ft per 10-yd color at 2 kt).
 */
import {
  feet,
  feetToMeters,
  meters,
  type Meters,
  type MetersPerSecond,
} from '@troll/units';
import { V_REF } from './v-ref.js';

export type LeadcoreParams = {
  /** Depth per color at V_REF, metres. */
  readonly c0: Meters;
  readonly gamma: number;
  readonly tag: 'ESTIMATED' | 'MEASURED';
  readonly uncertainty: string;
};

/**
 * Folklore starting point: ~5 ft per color at 2 kt.
 * ESTIMATED ±40%. TODO(calibrate): replace from probe data in Phase 6.
 */
export const LEADCORE_DEFAULT_PARAMS: LeadcoreParams = {
  c0: feetToMeters(feet(5)),
  gamma: 1.0,
  tag: 'ESTIMATED',
  uncertainty: '±40%',
};

export type SolveLeadcoreInput = {
  readonly colorsOut: number;
  readonly stw: MetersPerSecond;
  readonly backingSag?: Meters;
  readonly leaderRise?: Meters;
  readonly params?: LeadcoreParams;
};

export type SolveLeadcoreResult = {
  readonly depth: Meters;
  readonly depthPerColor: Meters;
  readonly assumptions: string[];
};

export function solveLeadcore(input: SolveLeadcoreInput): SolveLeadcoreResult {
  if (input.colorsOut < 0) {
    throw new Error('colorsOut must be >= 0');
  }
  if (input.stw <= 0) {
    throw new Error('stw must be > 0 for leadcore depth');
  }

  const params = input.params ?? LEADCORE_DEFAULT_PARAMS;
  const backingSag = input.backingSag ?? meters(0);
  const leaderRise = input.leaderRise ?? meters(0);

  const depthPerColorM =
    params.c0 * (input.stw / V_REF) ** -params.gamma;
  const depthM =
    input.colorsOut * depthPerColorM + backingSag - leaderRise;

  const assumptions = [
    `leadcore c0=${params.c0} m/color γ=${params.gamma} (${params.tag} ${params.uncertainty})`,
    'TODO(calibrate): leadcore c0/gamma from probe data in Phase 6',
    `V_REF=${V_REF} m/s (2.0 kt chart convention)`,
  ];

  return {
    depth: meters(Math.max(0, depthM)),
    depthPerColor: meters(depthPerColorM),
    assumptions,
  };
}

/** Wire shares the leadcore power-law form with its own ESTIMATED params. */
export type SolveWireInput = SolveLeadcoreInput & {
  /** Metres of wire out — converted to an equivalent "color" count at 10 yd/color. */
  readonly wireOut?: Meters;
};

const METERS_PER_COLOR = feetToMeters(feet(30)); // 10 yd color

export function solveWire(input: SolveWireInput): SolveLeadcoreResult {
  const colorsOut =
    input.wireOut !== undefined
      ? input.wireOut / METERS_PER_COLOR
      : input.colorsOut;

  const result = solveLeadcore({ ...input, colorsOut });
  return {
    ...result,
    assumptions: [
      ...result.assumptions,
      'wire uses leadcore power-law with ESTIMATED params (same folklore start)',
    ],
  };
}
