/** Ring buffer holds recent 1 Hz samples for the live depth display. */
export const RING_BUFFER_CAPACITY = 120;

/** Sample into the ring buffer at 1 Hz (TASKS 2.2). */
export const SAMPLE_INTERVAL_MS = 1000;

/**
 * Persist cadence to IndexedDB.
 * Spec docs/05-offline-sync.md: 1 point per 10 s persisted.
 */
export const PERSIST_INTERVAL_MS = 10_000;

/**
 * Douglas-Peucker epsilon in metres. ~5 m keeps troll-pass shape without
 * retaining every GPS jitter sample after close.
 */
export const SIMPLIFY_EPSILON_M = 5;

/** Earth radius for equirectangular / haversine helpers, metres. */
export const EARTH_RADIUS_M = 6_371_000;
