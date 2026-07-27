import type { Recommendation, RuleContext } from '@troll/engine';
import { recommendFromRules } from '@troll/engine';
import { FEEDBACK_QUESTION } from '@troll/shared';
import { getLocalDb } from '../db/database.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import { ensurePersonalOrg } from '../trips/session.js';
import type {
  RecommendationFeedbackRecord,
  RecommendationRecord,
} from './types.js';

export { FEEDBACK_QUESTION };

/** Issue a local recommendation (offline-first) and persist it for feedback. */
export async function issueRecommendation(
  ctx: RuleContext,
): Promise<RecommendationRecord> {
  const orgId = await ensurePersonalOrg();
  const payload = recommendFromRules({ ctx });
  const record: RecommendationRecord = {
    id: ulid(),
    orgId,
    context: { ...ctx },
    payload,
    rulesetVersion: payload.rulesetVersion,
    createdAt: new Date().toISOString(),
  };
  await writeLocal('recommendations', serializeRec(record), {
    orgId,
    opType: 'create',
  });
  return record;
}

function serializeRec(record: RecommendationRecord): {
  id: string;
  orgId: string;
  context: Record<string, unknown>;
  payload: Record<string, unknown>;
  rulesetVersion?: number;
  createdAt: string;
} {
  return {
    id: record.id,
    orgId: record.orgId,
    context: record.context,
    payload: record.payload as unknown as Record<string, unknown>,
    rulesetVersion: record.rulesetVersion,
    createdAt: record.createdAt,
  };
}

/**
 * Record thumbs-down. The only content is the answer to
 * {@link FEEDBACK_QUESTION}.
 */
export async function submitThumbsDown(input: {
  recommendationId: string;
  ranInstead: string;
}): Promise<RecommendationFeedbackRecord> {
  const ranInstead = input.ranInstead.trim();
  if (!ranInstead) {
    throw new Error(`${FEEDBACK_QUESTION} — answer required`);
  }

  const db = getLocalDb();
  const existing = await db.recommendationFeedback
    .where('recommendationId')
    .equals(input.recommendationId)
    .first();
  if (existing) return existing;

  const rec = await db.recommendations.get(input.recommendationId);
  if (!rec) {
    throw new Error('recommendation not found');
  }

  const row: RecommendationFeedbackRecord = {
    id: ulid(),
    orgId: rec.orgId,
    recommendationId: input.recommendationId,
    thumbs: 'down',
    ranInstead,
    createdAt: new Date().toISOString(),
  };
  await writeLocal('recommendationFeedback', row, {
    orgId: rec.orgId,
    opType: 'create',
  });
  return row;
}

export async function getFeedbackFor(
  recommendationId: string,
): Promise<RecommendationFeedbackRecord | undefined> {
  return getLocalDb()
    .recommendationFeedback.where('recommendationId')
    .equals(recommendationId)
    .first();
}

export type { Recommendation, RuleContext, RecommendationRecord };
