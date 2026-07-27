import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import {
  MemoryFeedbackStore,
  MemoryRecommendationStore,
} from './memory-store.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';
import { FEEDBACK_STORE, RECOMMENDATION_STORE } from './types.js';

@Module({
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    OrgAuthGuard,
    {
      provide: RECOMMENDATION_STORE,
      useFactory: () => new MemoryRecommendationStore(),
    },
    {
      provide: FEEDBACK_STORE,
      useFactory: () => new MemoryFeedbackStore(),
    },
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
