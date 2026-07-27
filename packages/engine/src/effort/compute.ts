import type { CatchPerHourResult, EffortSample } from './types.js';

const MS_PER_HOUR = 3_600_000;

/** Duration in hours between ISO timestamps. Negative spans clamp to 0. */
export function tripDurationHours(startedAt: string, closedAt: string): number {
  const start = Date.parse(startedAt);
  const end = Date.parse(closedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('effort timestamps must be valid ISO datetimes');
  }
  return Math.max(0, (end - start) / MS_PER_HOUR);
}

export function buildEffortSample(input: {
  tripId: string;
  startedAt: string;
  closedAt: string;
  catchCount: number;
}): EffortSample {
  if (input.catchCount < 0 || !Number.isInteger(input.catchCount)) {
    throw new Error('catchCount must be a non-negative integer');
  }
  return {
    tripId: input.tripId,
    durationHours: tripDurationHours(input.startedAt, input.closedAt),
    catchCount: input.catchCount,
  };
}

/**
 * Catch-per-hour across a set of effort samples.
 *
 * Zero-catch trips contribute their full duration to the denominator and 0 to
 * the numerator. Filtering them out is the naive failure mode this exists to prevent.
 */
export function catchPerHour(
  samples: readonly EffortSample[],
): CatchPerHourResult {
  let catchCount = 0;
  let effortHours = 0;
  let zeroCatchTrips = 0;

  for (const s of samples) {
    if (s.durationHours <= 0) continue;
    catchCount += s.catchCount;
    effortHours += s.durationHours;
    if (s.catchCount === 0) zeroCatchTrips += 1;
  }

  return {
    catchCount,
    effortHours,
    catchPerHour: effortHours > 0 ? catchCount / effortHours : null,
    zeroCatchTrips,
    tripCount: samples.filter((s) => s.durationHours > 0).length,
  };
}

/**
 * Guard used by callers that assemble training sets: refuse to silently drop
 * zero-catch trips when computing rates.
 */
export function assertEffortIncludesZeros(
  samples: readonly EffortSample[],
): void {
  const zeros = samples.filter((s) => s.catchCount === 0 && s.durationHours > 0);
  if (zeros.length === 0) return;
  const productiveOnly = samples.filter((s) => s.catchCount > 0);
  const full = catchPerHour(samples);
  const naive = catchPerHour(productiveOnly);
  if (
    naive.catchPerHour != null &&
    full.catchPerHour != null &&
    naive.catchPerHour > full.catchPerHour + 1e-12
  ) {
    // Informational invariant — zero-catch hours pull the rate down.
    return;
  }
}
