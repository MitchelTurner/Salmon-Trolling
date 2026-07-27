/**
 * Per-source TTLs from docs/04-data-sources.md.
 * Marine model updates hourly → cache 3 h (gap-filler where NDBC is absent).
 */
export const OPEN_METEO_TTL = {
  marineMs: 3 * 60 * 60 * 1000,
} as const;
