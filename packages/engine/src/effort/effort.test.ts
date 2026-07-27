import { describe, expect, it } from 'vitest';
import {
  assertEffortIncludesZeros,
  buildEffortSample,
  catchPerHour,
  tripDurationHours,
} from './compute.js';
import type { EffortSample } from './types.js';

describe('tripDurationHours', () => {
  it('computes hours between close and start', () => {
    expect(
      tripDurationHours(
        '2026-07-27T10:00:00.000Z',
        '2026-07-27T14:00:00.000Z',
      ),
    ).toBe(4);
  });
});

describe('catchPerHour', () => {
  it('keeps zero-catch trips in the denominator', () => {
    const samples: EffortSample[] = [
      buildEffortSample({
        tripId: 'a',
        startedAt: '2026-07-27T10:00:00.000Z',
        closedAt: '2026-07-27T12:00:00.000Z',
        catchCount: 2,
      }),
      buildEffortSample({
        tripId: 'b',
        startedAt: '2026-07-27T10:00:00.000Z',
        closedAt: '2026-07-27T14:00:00.000Z',
        catchCount: 0, // blank trip — must count
      }),
    ];

    const rate = catchPerHour(samples);
    expect(rate.zeroCatchTrips).toBe(1);
    expect(rate.effortHours).toBe(6);
    expect(rate.catchCount).toBe(2);
    expect(rate.catchPerHour).toBeCloseTo(2 / 6, 8);

    // Naive implementations throw zero-catch trips away and inflate CPUE.
    const naive = catchPerHour(samples.filter((s) => s.catchCount > 0));
    expect(naive.catchPerHour).toBeCloseTo(1, 8);
    expect(naive.catchPerHour!).toBeGreaterThan(rate.catchPerHour!);
  });

  it('returns null catchPerHour when there is no effort', () => {
    expect(catchPerHour([]).catchPerHour).toBeNull();
  });

  it('records a solo blank trip as effort with CPUE 0', () => {
    const blank = buildEffortSample({
      tripId: 'blank',
      startedAt: '2026-07-27T08:00:00.000Z',
      closedAt: '2026-07-27T11:00:00.000Z',
      catchCount: 0,
    });
    const rate = catchPerHour([blank]);
    expect(rate.catchPerHour).toBe(0);
    expect(rate.effortHours).toBe(3);
    expect(rate.zeroCatchTrips).toBe(1);
  });

  it('assertEffortIncludesZeros is a no-op when zeros are retained', () => {
    const samples = [
      buildEffortSample({
        tripId: 'a',
        startedAt: '2026-07-27T10:00:00.000Z',
        closedAt: '2026-07-27T11:00:00.000Z',
        catchCount: 0,
      }),
    ];
    expect(() => assertEffortIncludesZeros(samples)).not.toThrow();
  });
});
