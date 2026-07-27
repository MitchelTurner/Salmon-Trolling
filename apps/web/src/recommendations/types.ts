import type { Recommendation } from '@troll/engine';

/** Local copy of a recommendation issued for feedback. */
export type RecommendationRecord = {
  id: string;
  orgId: string;
  context: Record<string, unknown>;
  payload: Recommendation;
  rulesetVersion?: number;
  createdAt: string;
};

/**
 * Thumbs-down feedback. The only question is what they ran instead —
 * no star ratings, no multi-field surveys.
 */
export type RecommendationFeedbackRecord = {
  id: string;
  orgId: string;
  recommendationId: string;
  thumbs: 'down';
  ranInstead: string;
  createdAt: string;
};
