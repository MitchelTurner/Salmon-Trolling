import {
  RULES_SCORE_CAP,
  type RecommendationBasis,
} from './types.js';

/**
 * Clamp a raw score into [0, 1], and enforce the rules-basis honesty cap.
 */
export function clampRecommendationScore(
  score: number,
  basis: RecommendationBasis,
): number {
  if (!Number.isFinite(score)) {
    throw new Error('Recommendation.score must be finite');
  }
  const unit = Math.min(1, Math.max(0, score));
  if (basis === 'rules') {
    return Math.min(unit, RULES_SCORE_CAP);
  }
  return unit;
}

/**
 * Combine rule match weights into a single raw score via noisy-OR, then clamp.
 * Noisy-OR stays in (0, 1) and grows with more independent support.
 */
export function scoreFromRuleWeights(
  weights: readonly number[],
  basis: RecommendationBasis = 'rules',
): number {
  if (weights.length === 0) {
    return clampRecommendationScore(0.2, basis);
  }
  let survival = 1;
  for (const w of weights) {
    const clamped = Math.min(1, Math.max(0, w));
    survival *= 1 - clamped;
  }
  return clampRecommendationScore(1 - survival, basis);
}
