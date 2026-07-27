/**
 * Recommendation output contract (03-recommendations.md).
 *
 * A recommendation without reasons must fail type-checking, not just review.
 * Rules-basis scores are capped at RULES_SCORE_CAP — folk knowledge is not a model.
 */

import type { Meters, MetersPerSecond } from '@troll/units';
import type { FinishHint, RuleFactor } from '../rules/types.js';

/** At least one element — empty arrays are not assignable. */
export type NonEmptyArray<T> = readonly [T, ...T[]];

export type RecommendationBasis = 'rules' | 'personal' | 'community';

/** Hard cap when basis is rules (no fitted model yet). */
export const RULES_SCORE_CAP = 0.6;

export type Band<T> = {
  readonly min: T;
  readonly max: T;
};

export type GearSuggestion = {
  readonly finishes: readonly FinishHint[];
  readonly note?: string;
};

export type Reason = {
  readonly factor: RuleFactor | string;
  /** What was observed in context. */
  readonly observation: string;
  /** What that implies for the presentation. */
  readonly effect: string;
  readonly weight: number;
};

export type Recommendation = {
  readonly depthBand: Band<Meters>;
  readonly speedBand: Band<MetersPerSecond>;
  readonly attractor: GearSuggestion | null;
  readonly lure: GearSuggestion;
  readonly leaderLength: Meters;
  /** Never empty — enforced by NonEmptyArray. */
  readonly reasons: NonEmptyArray<Reason>;
  /** 0–1; capped at RULES_SCORE_CAP when basis === 'rules'. */
  readonly score: number;
  readonly basis: RecommendationBasis;
  /** Ruleset version when basis is rules. */
  readonly rulesetVersion?: number;
};

/** Runtime guard for constructing NonEmptyArray from a dynamic list. */
export function nonEmptyReasons(
  reasons: readonly Reason[],
): NonEmptyArray<Reason> {
  if (reasons.length === 0) {
    throw new Error('Recommendation.reasons must be non-empty');
  }
  return reasons as NonEmptyArray<Reason>;
}
