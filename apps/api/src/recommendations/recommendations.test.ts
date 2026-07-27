import { describe, expect, it } from 'vitest';
import { RULES_SCORE_CAP } from '@troll/engine';
import {
  MemoryFeedbackStore,
  MemoryRecommendationStore,
} from './memory-store.js';
import { RecommendationsService } from './recommendations.service.js';

describe('RecommendationsService', () => {
  function setup() {
    const recommendations = new MemoryRecommendationStore();
    const feedback = new MemoryFeedbackStore();
    const service = new RecommendationsService(recommendations, feedback);
    return { service, recommendations, feedback };
  }

  it('creates a rules-basis recommendation with non-empty reasons', async () => {
    const { service } = setup();
    const { recommendation } = await service.create('org_1', {
      lightLevel: 0.1,
      turbidity: 0.2,
      weekOfYear: 24,
    });

    expect(recommendation.payload.basis).toBe('rules');
    expect(recommendation.payload.reasons.length).toBeGreaterThan(0);
    expect(recommendation.payload.score).toBeLessThanOrEqual(RULES_SCORE_CAP);
    expect(recommendation.id).toMatch(/^rec_/);
  });

  it('records thumbs-down feedback with ranInstead only', async () => {
    const { service } = setup();
    const { recommendation } = await service.create('org_1', {
      lightLevel: 0.5,
      turbidity: 0.2,
      weekOfYear: 24,
    });

    const fb = await service.submitFeedback('org_1', recommendation.id, {
      thumbs: 'down',
      ranInstead: 'green spoony behind a 9" chrome flasher at 30 fathoms',
    });

    expect(fb.thumbs).toBe('down');
    expect(fb.ranInstead).toContain('spoony');
    expect(fb.recommendationId).toBe(recommendation.id);
  });

  it('is idempotent for duplicate feedback on the same recommendation', async () => {
    const { service } = setup();
    const { recommendation } = await service.create('org_1', {
      lightLevel: 0.5,
      turbidity: 0.2,
      weekOfYear: 24,
    });

    const first = await service.submitFeedback('org_1', recommendation.id, {
      thumbs: 'down',
      ranInstead: 'first answer',
    });
    const second = await service.submitFeedback('org_1', recommendation.id, {
      thumbs: 'down',
      ranInstead: 'different answer',
    });

    expect(second.id).toBe(first.id);
    expect(second.ranInstead).toBe('first answer');
  });

  it('rejects feedback for another org', async () => {
    const { service } = setup();
    const { recommendation } = await service.create('org_1', {
      lightLevel: 0.5,
      turbidity: 0.2,
      weekOfYear: 24,
    });

    await expect(
      service.submitFeedback('org_other', recommendation.id, {
        thumbs: 'down',
        ranInstead: 'should not land',
      }),
    ).rejects.toThrow(/not found/);
  });
});
