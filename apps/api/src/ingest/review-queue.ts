export type ReviewReason = 'new' | 'changed' | 'parse_failed';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReviewItem = {
  id: string;
  regulationId: string;
  regionId: string;
  nrId: string;
  reason: ReviewReason;
  status: ReviewStatus;
  sourceUrl: string;
  contentHash: string;
  createdAt: string;
  resolvedAt?: string;
};

export interface ReviewQueue {
  enqueue(
    item: Omit<ReviewItem, 'id' | 'status' | 'createdAt' | 'resolvedAt'> & {
      id?: string;
      createdAt?: string;
    },
  ): Promise<ReviewItem>;
  listPending(regionId?: string): Promise<ReviewItem[]>;
  resolve(
    id: string,
    status: Exclude<ReviewStatus, 'pending'>,
  ): Promise<ReviewItem>;
}

export class MemoryReviewQueue implements ReviewQueue {
  private readonly items = new Map<string, ReviewItem>();
  private seq = 0;

  async enqueue(
    input: Omit<ReviewItem, 'id' | 'status' | 'createdAt' | 'resolvedAt'> & {
      id?: string;
      createdAt?: string;
    },
  ): Promise<ReviewItem> {
    const id = input.id ?? `review_${++this.seq}`;
    const existing = [...this.items.values()].find(
      (i) =>
        i.status === 'pending' &&
        i.regulationId === input.regulationId &&
        i.reason === input.reason,
    );
    if (existing) return existing;

    const item: ReviewItem = {
      id,
      regulationId: input.regulationId,
      regionId: input.regionId,
      nrId: input.nrId,
      reason: input.reason,
      status: 'pending',
      sourceUrl: input.sourceUrl,
      contentHash: input.contentHash,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.items.set(id, item);
    return item;
  }

  async listPending(regionId?: string): Promise<ReviewItem[]> {
    return [...this.items.values()]
      .filter(
        (i) =>
          i.status === 'pending' &&
          (regionId === undefined || i.regionId === regionId),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async resolve(
    id: string,
    status: Exclude<ReviewStatus, 'pending'>,
  ): Promise<ReviewItem> {
    const item = this.items.get(id);
    if (!item) throw new Error(`review item not found: ${id}`);
    const next = {
      ...item,
      status,
      resolvedAt: new Date().toISOString(),
    };
    this.items.set(id, next);
    return next;
  }
}
