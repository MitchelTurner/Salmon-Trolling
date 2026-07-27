/**
 * Per-source TTLs from docs/04-data-sources.md.
 * Match real update cadence — never convenience.
 */
export const COOPS_TTL = {
  /** Tide / current predictions are static tables. */
  predictionsMs: 30 * 24 * 60 * 60 * 1000,
  /** Water level / temp observations update ~every 6 minutes. */
  observationsMs: 10 * 60 * 1000,
} as const;
