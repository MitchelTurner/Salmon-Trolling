/**
 * Composed depth uncertainty.
 * Spec: docs/02-depth-engine.md
 *
 * sigma is composed, not guessed:
 * - STW source: measured ±0.1 kt, current-corrected ±0.4 kt, bare SOG ±1.0 kt
 * - Each ESTIMATED constant contributes its stated uncertainty
 * - Fitted models contribute their residual standard error
 * - Propagate by evaluating the model at ±1σ on each dominant input and taking RSS
 *
 * If sigma > 0.2 * depth, the UI should show a range rather than a point.
 */
import {
  METERS_PER_SECOND_PER_KNOT,
  meters,
  metersPerSecond,
  type Meters,
  type MetersPerSecond,
} from '@troll/units';
import type { StwSource } from './stw.js';

/** STW 1-sigma by source, knots (spec). */
export const STW_SIGMA_KT: Record<StwSource, number> = {
  paddle_wheel: 0.1,
  sog_minus_current: 0.4,
  bare_sog: 1.0,
};

/** Fraction of depth above which the UI should show a range. */
export const WIDE_SIGMA_FRACTION = 0.2;

export type UncertaintyComponent = {
  readonly name: string;
  /** Contribution to depth sigma from this input, metres (absolute). */
  readonly sigmaM: Meters;
};

export type EstimatedConstantPerturbation = {
  readonly name: string;
  /**
   * Relative 1-sigma (0.2 = ±20%). Prefer {@link parseRelativeUncertainty}
   * from the constant's provenance string.
   */
  readonly relativeSigma: number;
  /**
   * Evaluate depth (metres) with this constant scaled by `scale`
   * (1 = nominal, 1+relativeSigma = +1σ).
   */
  readonly depthAtScale: (scale: number) => number;
};

export type ComposeSigmaInput = {
  readonly depth: Meters;
  readonly stw: MetersPerSecond;
  readonly stwSource: StwSource;
  /** Depth (m) as a function of STW (m/s), other inputs held at nominal. */
  readonly depthAtStw: (stwMs: number) => number;
  readonly estimatedConstants?: readonly EstimatedConstantPerturbation[];
  /** Residual standard error from a fitted model, metres. */
  readonly fitRmse?: Meters;
};

export type ComposeSigmaResult = {
  readonly sigma: Meters;
  /** True when sigma > 0.2 * depth — UI should show a range. */
  readonly wide: boolean;
  readonly components: readonly UncertaintyComponent[];
};

/** Parse provenance strings like "±20%" or "±0.2" into a relative sigma. */
export function parseRelativeUncertainty(text: string): number {
  const percent = text.match(/±\s*([0-9.]+)\s*%/);
  if (percent?.[1] !== undefined) {
    return Number(percent[1]) / 100;
  }
  const fraction = text.match(/±\s*([0-9.]+)\s*$/);
  if (fraction?.[1] !== undefined) {
    return Number(fraction[1]);
  }
  throw new Error(`cannot parse relative uncertainty: ${text}`);
}

export function stwSigmaMs(source: StwSource): MetersPerSecond {
  return metersPerSecond(STW_SIGMA_KT[source] * METERS_PER_SECOND_PER_KNOT);
}

/**
 * Central finite-difference half-width: |f(x+σ) − f(x−σ)| / 2.
 * Clamps the lower evaluation point so STW never goes negative.
 */
function finiteDifferenceSigma(
  nominal: number,
  sigma: number,
  evaluate: (value: number) => number,
): number {
  const lo = Math.max(0, nominal - sigma);
  const hi = nominal + sigma;
  return Math.abs(evaluate(hi) - evaluate(lo)) / 2;
}

/**
 * Compose depth sigma from STW, ESTIMATED constants, and fit RMSE via RSS of
 * one-at-a-time ±1σ model evaluations.
 */
export function composeSigma(input: ComposeSigmaInput): ComposeSigmaResult {
  if (input.depth < 0) {
    throw new Error('depth must be >= 0');
  }
  if (input.stw < 0) {
    throw new Error('stw must be >= 0');
  }

  const components: UncertaintyComponent[] = [];

  const stwSig = stwSigmaMs(input.stwSource);
  const stwDepthSigma = finiteDifferenceSigma(
    input.stw,
    stwSig,
    input.depthAtStw,
  );
  components.push({
    name: `stw:${input.stwSource}`,
    sigmaM: meters(stwDepthSigma),
  });

  for (const constant of input.estimatedConstants ?? []) {
    if (constant.relativeSigma < 0) {
      throw new Error(
        `relativeSigma for ${constant.name} must be >= 0`,
      );
    }
    const depthSigma = finiteDifferenceSigma(
      1,
      constant.relativeSigma,
      constant.depthAtScale,
    );
    components.push({
      name: `constant:${constant.name}`,
      sigmaM: meters(depthSigma),
    });
  }

  if (input.fitRmse !== undefined) {
    if (input.fitRmse < 0) {
      throw new Error('fitRmse must be >= 0');
    }
    components.push({
      name: 'fit:rmse',
      sigmaM: meters(input.fitRmse),
    });
  }

  let sumSq = 0;
  for (const component of components) {
    sumSq += component.sigmaM * component.sigmaM;
  }
  const sigmaM = Math.sqrt(sumSq);
  const wide = sigmaM > WIDE_SIGMA_FRACTION * input.depth;

  return {
    sigma: meters(sigmaM),
    wide,
    components,
  };
}
