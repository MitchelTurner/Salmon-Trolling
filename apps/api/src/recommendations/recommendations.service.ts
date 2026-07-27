import { Inject, Injectable } from '@nestjs/common';
import { recommendFromRules, type Recommendation } from '@troll/engine';
import type {
  RecommendationFeedbackBody,
  RuleContextBody,
} from '@troll/shared';
import { randomUUID } from 'node:crypto';
import {
  FEEDBACK_STORE,
  RECOMMENDATION_STORE,
  type FeedbackStore,
  type RecommendationStore,
  type StoredFeedback,
  type StoredRecommendation,
} from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 26)}`;
}

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(RECOMMENDATION_STORE)
    private readonly recommendations: RecommendationStore,
    @Inject(FEEDBACK_STORE) private readonly feedback: FeedbackStore,
  ) {}

  async create(orgId: string, context: RuleContextBody): Promise<{
    generatedAt: string;
    recommendation: StoredRecommendation;
  }> {
    const payload: Recommendation = recommendFromRules({ ctx: context });
    const createdAt = new Date().toISOString();
    const row: StoredRecommendation = {
      id: newId('rec'),
      orgId,
      context,
      payload,
      rulesetVersion: payload.rulesetVersion,
      createdAt,
    };
    await this.recommendations.put(row);
    return { generatedAt: createdAt, recommendation: row };
  }

  async submitFeedback(
    orgId: string,
    recommendationId: string,
    body: RecommendationFeedbackBody,
  ): Promise<StoredFeedback> {
    const rec = await this.recommendations.get(recommendationId);
    if (!rec || rec.orgId !== orgId) {
      throw new Error('recommendation not found');
    }

    const ranInstead = body.ranInstead.trim();
    if (!ranInstead) {
      throw new Error('ranInstead is required');
    }

    const row: StoredFeedback = {
      id: newId('rbf'),
      orgId,
      recommendationId,
      thumbs: 'down',
      ranInstead,
      createdAt: new Date().toISOString(),
    };

    const claimed = await this.feedback.claim(row);
    if (!claimed) {
      const existing = await this.feedback.getByRecommendation(recommendationId);
      if (existing) return existing;
      throw new Error('feedback already recorded');
    }
    return row;
  }
}
