import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import {
  CreateRecommendationsDto,
  RecommendationFeedbackDto,
} from './recommendations.dto.js';
import { RecommendationsService } from './recommendations.service.js';

@Controller('recommendations')
@UseGuards(OrgAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  /** POST /recommendations — body: context → Recommendation. */
  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body() body: CreateRecommendationsDto,
  ) {
    const orgId = req.orgContext!.orgId;
    const result = await this.recommendations.create(orgId, body.context);
    return {
      generatedAt: result.generatedAt,
      id: result.recommendation.id,
      recommendation: result.recommendation.payload,
      rulesetVersion: result.recommendation.rulesetVersion,
    };
  }

  /**
   * POST /recommendations/:id/feedback
   * Thumbs-down only — asks one question: what did you run instead?
   */
  @Post(':id/feedback')
  async feedback(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: RecommendationFeedbackDto,
  ) {
    const orgId = req.orgContext!.orgId;
    try {
      const row = await this.recommendations.submitFeedback(orgId, id, body);
      return {
        generatedAt: row.createdAt,
        id: row.id,
        recommendationId: row.recommendationId,
        thumbs: row.thumbs,
        ranInstead: row.ranInstead,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'feedback failed';
      if (message.includes('not found')) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/recommendation-not-found',
          title: 'Recommendation not found',
          detail: message,
        });
      }
      throw new BadRequestException({
        type: 'https://troll.app/problems/recommendation-feedback',
        title: 'Feedback failed',
        detail: message,
      });
    }
  }
}
