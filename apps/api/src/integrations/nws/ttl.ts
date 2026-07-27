/**
 * Per-source TTLs from docs/04-data-sources.md.
 * Marine zone forecasts update ~hourly → cache 1 h.
 */
export const NWS_TTL = {
  marineForecastMs: 60 * 60 * 1000,
} as const;
