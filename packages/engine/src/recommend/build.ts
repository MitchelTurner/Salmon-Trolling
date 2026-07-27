import { meters, metersPerSecond, type Meters, type MetersPerSecond } from '@troll/units';
import { DEFAULT_RULE_SET } from '../rules/catalog.js';
import { evaluateRuleSet } from '../rules/evaluate.js';
import type {
  FinishHint,
  RuleContext,
  RuleFactor,
  RuleMatch,
  RuleSet,
} from '../rules/types.js';
import { scoreFromRuleWeights } from './score.js';
import {
  nonEmptyReasons,
  type GearSuggestion,
  type Reason,
  type Recommendation,
} from './types.js';

/** Baseline summer troll band — SE Alaska starting point before rule biases. */
export const BASELINE_DEPTH_MIN_M = 12;
export const BASELINE_DEPTH_MAX_M = 28;
export const BASELINE_SPEED_MIN_MS = 1.15; // ~2.2 kt
export const BASELINE_SPEED_MAX_MS = 1.8; // ~3.5 kt
export const BASELINE_LEADER_M = 1.5;

export type RecommendFromRulesInput = {
  readonly ctx: RuleContext;
  readonly ruleSet?: RuleSet;
  readonly leaderLength?: Meters;
};

function formatNum(n: number, digits = 2): string {
  return n.toFixed(digits);
}

export function observationForFactor(
  factor: RuleFactor | string,
  ctx: RuleContext,
): string {
  switch (factor) {
    case 'light': {
      const parts = [`light level ${formatNum(ctx.lightLevel)}`];
      if (ctx.cloudCover !== undefined) {
        parts.push(`cloud cover ${formatNum(ctx.cloudCover)}`);
      }
      return parts.join(', ');
    }
    case 'turbidity':
      return `turbidity ${formatNum(ctx.turbidity)}`;
    case 'tide': {
      const stage = ctx.tideStage ?? 'unknown stage';
      if (ctx.currentSpeedMs !== undefined) {
        return `${stage}, current ${formatNum(ctx.currentSpeedMs)} m/s`;
      }
      return String(stage);
    }
    case 'seaTemp':
      return ctx.seaTempC !== undefined
        ? `sea temp ${formatNum(ctx.seaTempC, 1)} °C`
        : 'sea temp unavailable';
    case 'runTiming': {
      const species = ctx.species ?? 'unspecified species';
      return `${species}, ISO week ${ctx.weekOfYear}`;
    }
    case 'moon':
      return ctx.moonIllumination !== undefined
        ? `moon illumination ${formatNum(ctx.moonIllumination)}`
        : 'moon illumination unavailable';
    default:
      return 'context snapshot';
  }
}

function reasonsFromMatches(
  matches: readonly RuleMatch[],
  ctx: RuleContext,
): Reason[] {
  return matches.map((m) => ({
    factor: m.then.factor,
    observation: observationForFactor(m.then.factor, ctx),
    effect: m.then.effect,
    weight: m.then.weight,
  }));
}

function baselineReason(ctx: RuleContext): Reason {
  return {
    factor: 'runTiming',
    observation: `week ${ctx.weekOfYear}, light ${formatNum(ctx.lightLevel)}`,
    effect: 'no matching rules — using baseline summer troll band',
    weight: 0.2,
  };
}

function uniqueFinishes(matches: readonly RuleMatch[]): FinishHint[] {
  const seen = new Set<FinishHint>();
  const out: FinishHint[] = [];
  // Higher weight first so primary finishes win ordering.
  const ordered = [...matches].sort((a, b) => b.then.weight - a.then.weight);
  for (const m of ordered) {
    for (const f of m.then.finishes ?? []) {
      if (seen.has(f)) continue;
      seen.add(f);
      out.push(f);
    }
  }
  return out;
}

function sumBias(
  matches: readonly RuleMatch[],
  key: 'depthBiasM' | 'speedBiasMs',
): number {
  let sum = 0;
  let weightSum = 0;
  for (const m of matches) {
    const bias = m.then[key];
    if (bias === undefined) continue;
    sum += bias * m.then.weight;
    weightSum += m.then.weight;
  }
  if (weightSum === 0) return 0;
  return sum / weightSum;
}

function band(
  min: number,
  max: number,
  bias: number,
): { min: number; max: number } {
  return { min: min + bias, max: max + bias };
}

/**
 * Build a typed Recommendation from the declarative rules catalog.
 * Always returns non-empty reasons; rules-basis score is capped at 0.6.
 */
export function recommendFromRules(
  input: RecommendFromRulesInput,
): Recommendation {
  const ruleSet = input.ruleSet ?? DEFAULT_RULE_SET;
  const matches = evaluateRuleSet(input.ctx, ruleSet);
  const reasonList =
    matches.length > 0
      ? reasonsFromMatches(matches, input.ctx)
      : [baselineReason(input.ctx)];
  const reasons = nonEmptyReasons(reasonList);

  const depthBias = sumBias(matches, 'depthBiasM');
  const speedBias = sumBias(matches, 'speedBiasMs');
  const depth = band(BASELINE_DEPTH_MIN_M, BASELINE_DEPTH_MAX_M, depthBias);
  const speed = band(BASELINE_SPEED_MIN_MS, BASELINE_SPEED_MAX_MS, speedBias);

  const finishes = uniqueFinishes(matches);
  const lureFinishes: readonly FinishHint[] =
    finishes.length > 0 ? finishes : (['natural'] as const);

  const lure: GearSuggestion = {
    finishes: lureFinishes,
    note:
      finishes.length > 0
        ? 'from matching presentation rules'
        : 'baseline natural finish',
  };

  // Attractors only when finish rules fire hard enough to imply a teaser.
  const topWeight = matches.reduce((max, m) => Math.max(max, m.then.weight), 0);
  const attractor: GearSuggestion | null =
    topWeight >= 0.55 && finishes.length > 0
      ? {
          finishes: lureFinishes.slice(0, 2),
          note: 'pair attractor finish with lure',
        }
      : null;

  const score = scoreFromRuleWeights(
    matches.map((m) => m.then.weight),
    'rules',
  );

  return {
    depthBand: {
      min: meters(depth.min),
      max: meters(depth.max),
    },
    speedBand: {
      min: metersPerSecond(speed.min),
      max: metersPerSecond(speed.max),
    },
    attractor,
    lure,
    leaderLength: input.leaderLength ?? meters(BASELINE_LEADER_M),
    reasons,
    score,
    basis: 'rules',
    rulesetVersion: ruleSet.version,
  };
}

/** Re-export branded constructors used by callers assembling recommendations. */
export type { Meters, MetersPerSecond };
