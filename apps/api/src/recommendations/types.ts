import type { Recommendation } from '@troll/engine';
import type { RuleContextBody } from '@troll/shared';

export const RECOMMENDATION_STORE = Symbol('RECOMMENDATION_STORE');
export const FEEDBACK_STORE = Symbol('FEEDBACK_STORE');

export type StoredRecommendation = {
  readonly id: string;
  readonly orgId: string;
  readonly context: RuleContextBody;
  readonly payload: Recommendation;
  readonly rulesetVersion?: number;
  readonly createdAt: string;
};

export type StoredFeedback = {
  readonly id: string;
  readonly orgId: string;
  readonly recommendationId: string;
  readonly thumbs: 'down';
  readonly ranInstead: string;
  readonly createdAt: string;
};

export interface RecommendationStore {
  put(row: StoredRecommendation): Promise<void>;
  get(id: string): Promise<StoredRecommendation | null>;
}

export interface FeedbackStore {
  /** Returns false if feedback already exists for this recommendation. */
  claim(row: StoredFeedback): Promise<boolean>;
  getByRecommendation(
    recommendationId: string,
  ): Promise<StoredFeedback | null>;
}
