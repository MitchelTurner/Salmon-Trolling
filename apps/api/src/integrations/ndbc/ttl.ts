/**
 * Per-source TTLs from docs/04-data-sources.md.
 * Buoy observations update ~hourly → cache 30 min.
 */
export const NDBC_TTL = {
  observationsMs: 30 * 60 * 1000,
} as const;
