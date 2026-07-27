/**
 * Recommendation API + feedback contracts (03-recommendations.md, 06-api.md).
 *
 * Thumbs-down asks exactly one question: what did you run instead?
 */

import { z } from 'zod';

export const RuleContextBodySchema = z.object({
  lightLevel: z.number().min(0).max(1),
  turbidity: z.number().min(0).max(1),
  weekOfYear: z.number().int().min(1).max(53),
  seaTempC: z.number().optional(),
  tideStage: z
    .enum(['flood', 'ebb', 'slack_flood', 'slack_ebb'])
    .optional(),
  currentSpeedMs: z.number().min(0).optional(),
  species: z
    .enum(['king', 'coho', 'pink', 'chum', 'sockeye', 'feeder_king'])
    .optional(),
  cloudCover: z.number().min(0).max(1).optional(),
  moonIllumination: z.number().min(0).max(1).optional(),
});

export type RuleContextBody = z.infer<typeof RuleContextBodySchema>;

export const CreateRecommendationsBodySchema = z.object({
  context: RuleContextBodySchema,
});

export type CreateRecommendationsBody = z.infer<
  typeof CreateRecommendationsBodySchema
>;

/** The only feedback shape we accept — one question, nothing else. */
export const RecommendationFeedbackBodySchema = z.object({
  thumbs: z.literal('down'),
  /** Free-text answer to: what did you run instead? */
  ranInstead: z.string().trim().min(1).max(2000),
});

export type RecommendationFeedbackBody = z.infer<
  typeof RecommendationFeedbackBodySchema
>;

export const FEEDBACK_QUESTION =
  'What did you run instead?' as const;
