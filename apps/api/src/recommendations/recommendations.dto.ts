import { createZodDto } from 'nestjs-zod';
import {
  CreateRecommendationsBodySchema,
  RecommendationFeedbackBodySchema,
} from '@troll/shared';

export class CreateRecommendationsDto extends createZodDto(
  CreateRecommendationsBodySchema,
) {}

export class RecommendationFeedbackDto extends createZodDto(
  RecommendationFeedbackBodySchema,
) {}
