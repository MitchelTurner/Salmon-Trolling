/**
 * Per-source TTL from docs/04-data-sources.md.
 * Always surface fetch time in the UI — emergency orders change mid-season.
 */
export const ADFG_TTL = {
  regulationsMs: 6 * 60 * 60 * 1000,
} as const;
