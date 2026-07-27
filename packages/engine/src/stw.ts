/**
 * Speed-through-water resolution.
 * Spec: docs/02-depth-engine.md — depth is a function of STW, not SOG.
 *
 * Priority:
 * 1. Paddle wheel / N2K speedThroughWater → confidence: measured
 * 2. SOG_vector − predictedCurrent_vector → confidence: modelled
 * 3. Bare SOG → confidence: modelled + loud tidal-current warning
 */
import {
  metersPerSecond,
  type Meters,
  type MetersPerSecond,
} from '@troll/units';

/** Exact DepthResult.confidence values that STW resolution can produce. */
export type StwConfidence = 'measured' | 'modelled';

export type StwSource = 'paddle_wheel' | 'sog_minus_current' | 'bare_sog';

/** Horizontal velocity in metres/second, east/north (local ENU). */
export type Velocity2 = {
  readonly eastMs: number;
  readonly northMs: number;
};

export type PredictedCurrent = Velocity2 & {
  readonly stationId: string;
  /** Distance from boat to the station used, metres. */
  readonly stationDistanceM: Meters | number;
  /**
   * How far the prediction epoch is from the query time, seconds.
   * Passed in — the engine never reads the clock.
   */
  readonly predictionTimeOffsetS: number;
};

export type ResolveStwInput = {
  /** Tier 1: paddle wheel / N2K water speed. */
  readonly speedThroughWater?: MetersPerSecond;
  /** Tier 2: speed-over-ground vector (east/north). */
  readonly sogVector?: Velocity2;
  /** Tier 2: predicted current at the boat from the nearest station. */
  readonly predictedCurrent?: PredictedCurrent;
  /** Tier 3: scalar SOG when no current correction is available. */
  readonly sog?: MetersPerSecond;
};

export type ResolveStwResult = {
  readonly stw: MetersPerSecond;
  readonly confidence: StwConfidence;
  readonly source: StwSource;
  readonly assumptions: string[];
};

/** Loud warning required whenever bare SOG is used as STW. */
export const BARE_SOG_WARNING =
  'no current correction available; depth may be off by 20%+ in tidal current';

function magnitude(v: Velocity2): number {
  return Math.hypot(v.eastMs, v.northMs);
}

function subtract(a: Velocity2, b: Velocity2): Velocity2 {
  return {
    eastMs: a.eastMs - b.eastMs,
    northMs: a.northMs - b.northMs,
  };
}

/**
 * Resolve STW from the best available input tier.
 * Never silently presents bare SOG as measured water speed.
 */
export function resolveStw(input: ResolveStwInput): ResolveStwResult {
  // Tier 1 — measured water speed.
  if (input.speedThroughWater !== undefined) {
    if (input.speedThroughWater < 0) {
      throw new Error('speedThroughWater must be >= 0');
    }
    return {
      stw: input.speedThroughWater,
      confidence: 'measured',
      source: 'paddle_wheel',
      assumptions: ['STW from paddle wheel / N2K speedThroughWater (measured)'],
    };
  }

  // Tier 2 — SOG corrected by predicted current.
  if (input.sogVector !== undefined && input.predictedCurrent !== undefined) {
    const relative = subtract(input.sogVector, input.predictedCurrent);
    const stwMs = magnitude(relative);
    const current = input.predictedCurrent;

    return {
      stw: metersPerSecond(stwMs),
      confidence: 'modelled',
      source: 'sog_minus_current',
      assumptions: [
        'STW = |SOG_vector − predictedCurrent_vector| (modelled)',
        `current station id=${current.stationId}`,
        `current station distance=${current.stationDistanceM} m`,
        `current prediction time offset=${current.predictionTimeOffsetS} s`,
      ],
    };
  }

  // Tier 3 — bare SOG. Always loud about the missing current correction.
  if (input.sog !== undefined) {
    if (input.sog < 0) {
      throw new Error('sog must be >= 0');
    }
    return {
      stw: input.sog,
      confidence: 'modelled',
      source: 'bare_sog',
      assumptions: [
        'STW taken as bare SOG (modelled)',
        BARE_SOG_WARNING,
      ],
    };
  }

  throw new Error(
    'resolveStw requires speedThroughWater, sogVector+predictedCurrent, or sog',
  );
}
