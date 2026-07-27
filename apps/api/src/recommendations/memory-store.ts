import type {
  FeedbackStore,
  RecommendationStore,
  StoredFeedback,
  StoredRecommendation,
} from './types.js';

export class MemoryRecommendationStore implements RecommendationStore {
  private readonly byId = new Map<string, StoredRecommendation>();

  async put(row: StoredRecommendation): Promise<void> {
    this.byId.set(row.id, row);
  }

  async get(id: string): Promise<StoredRecommendation | null> {
    return this.byId.get(id) ?? null;
  }
}

export class MemoryFeedbackStore implements FeedbackStore {
  private readonly byRecId = new Map<string, StoredFeedback>();

  async claim(row: StoredFeedback): Promise<boolean> {
    if (this.byRecId.has(row.recommendationId)) return false;
    this.byRecId.set(row.recommendationId, row);
    return true;
  }

  async getByRecommendation(
    recommendationId: string,
  ): Promise<StoredFeedback | null> {
    return this.byRecId.get(recommendationId) ?? null;
  }
}
