/**
 * Per-source TTL from docs/04-data-sources.md.
 * ENC / bathymetry is static — generate once, cache permanently.
 */
export const BATHY_TTL = {
  /** Permanent: never re-fetch static contour tables on a schedule. */
  permanent: true,
  /** Sentinel for caches that require a number (effectively no expiry). */
  permanentMs: Number.POSITIVE_INFINITY,
} as const;
