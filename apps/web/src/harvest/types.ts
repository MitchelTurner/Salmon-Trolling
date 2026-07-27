/**
 * In-memory draft only. Nothing is persisted until {@link confirmHarvestDraft}.
 * docs/30-domain-safety.mdc — never auto-submit.
 */
export type HarvestDraft = {
  readonly catchId?: string;
  readonly species: string;
  readonly t: string;
  readonly areaCode?: string;
  /** True when the draft was seeded from a kept catch via one-tap. */
  readonly fromCatch: boolean;
};
