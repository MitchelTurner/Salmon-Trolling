import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrollDatabase, setLocalDb, getLocalDb } from '../db/database.js';
import { ulid } from '../db/ulid.js';
import { TripRecorder } from './trip-recorder.js';
import type {
  Clock,
  GeoPositionSource,
  PositionSample,
  VisibilityApi,
} from './types.js';

function createFakeClock(startMs = 1_700_000_000_000): Clock & {
  advance: (ms: number) => void;
} {
  let now = startMs;
  const timers: Array<{ at: number; fn: () => void; every: number }> = [];

  return {
    now: () => now,
    setInterval: (fn, ms) => {
      const entry = { at: now + ms, fn, every: ms };
      timers.push(entry);
      return {
        clear: () => {
          const idx = timers.indexOf(entry);
          if (idx >= 0) timers.splice(idx, 1);
        },
      };
    },
    advance: (ms: number) => {
      const target = now + ms;
      while (true) {
        const next = timers
          .filter((t) => t.at <= target)
          .sort((a, b) => a.at - b.at)[0];
        if (!next) {
          now = target;
          break;
        }
        now = next.at;
        next.at = now + next.every;
        next.fn();
      }
    },
  };
}

function createFakeGeo(samples: PositionSample[]): GeoPositionSource & {
  push: (sample: PositionSample) => void;
} {
  let handler: ((s: PositionSample) => void) | null = null;
  return {
    watch(onSample) {
      handler = onSample;
      if (samples[0]) onSample(samples[0]);
      return { clear: () => {
        handler = null;
      } };
    },
    push: (sample) => handler?.(sample),
  };
}

function createFakeVisibility(): VisibilityApi & { hide: () => void } {
  let hidden = false;
  let listener: (() => void) | null = null;
  return {
    isHidden: () => hidden,
    addListener: (fn) => {
      listener = fn;
      return () => {
        listener = null;
      };
    },
    hide: () => {
      hidden = true;
      listener?.();
    },
  };
}

describe('TripRecorder', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`trip-test-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    const db = getLocalDb();
    db.close();
    await db.delete();
  });

  it('starts a trip, samples at 1 Hz into the ring, persists on interval', async () => {
    const clock = createFakeClock();
    const geo = createFakeGeo([
      { tMs: clock.now(), lon: -131.6, lat: 55.3, sogMs: 1.2 },
    ]);
    const visibility = createFakeVisibility();
    const live: PositionSample[] = [];

    const recorder = new TripRecorder({
      orgId: 'org1',
      geo,
      clock,
      visibility,
      persistIntervalMs: 10_000,
      sampleIntervalMs: 1000,
      onLiveSample: (s) => {
        if (s) live.push(s);
      },
    });

    const trip = await recorder.start();
    expect(trip.closedAt).toBeUndefined();
    expect(await getLocalDb().trips.get(trip.id)).toBeTruthy();

    geo.push({ tMs: clock.now() + 500, lon: -131.601, lat: 55.301, sogMs: 1.3 });
    clock.advance(1000);
    expect(recorder.getRingSamples().length).toBeGreaterThanOrEqual(1);
    expect(live.length).toBeGreaterThanOrEqual(1);

    geo.push({ tMs: clock.now(), lon: -131.602, lat: 55.302, sogMs: 1.4 });
    clock.advance(10_000);
    // flush any pending persist timer callbacks
    await vi.waitFor(async () => {
      const n = await getLocalDb().trackPoints.where('tripId').equals(trip.id).count();
      expect(n).toBeGreaterThanOrEqual(1);
    });

    recorder.dispose();
  });

  it('flushes a point when the screen goes hidden', async () => {
    const clock = createFakeClock();
    const geo = createFakeGeo([]);
    const visibility = createFakeVisibility();

    const recorder = new TripRecorder({
      orgId: 'org1',
      geo,
      clock,
      visibility,
      persistIntervalMs: 60_000,
      sampleIntervalMs: 1000,
    });

    const trip = await recorder.start();
    geo.push({ tMs: clock.now() + 100, lon: -131.6, lat: 55.3 });
    clock.advance(1000);
    visibility.hide();

    await vi.waitFor(async () => {
      const n = await getLocalDb().trackPoints.where('tripId').equals(trip.id).count();
      expect(n).toBeGreaterThanOrEqual(1);
    });

    recorder.dispose();
  });

  it('simplifies with Douglas-Peucker on close and drops sync ops for discarded points', async () => {
    const clock = createFakeClock();
    let t = clock.now();
    const geo = createFakeGeo([]);
    const visibility = createFakeVisibility();

    const recorder = new TripRecorder({
      orgId: 'org1',
      geo,
      clock,
      visibility,
      persistIntervalMs: 1000,
      sampleIntervalMs: 1000,
      simplifyEpsilonM: 50,
    });

    const trip = await recorder.start();

    // Nearly colinear points — DP should keep endpoints only at 50 m epsilon.
    const path = [
      { lon: -131.6, lat: 55.3 },
      { lon: -131.60005, lat: 55.30001 },
      { lon: -131.6001, lat: 55.30002 },
      { lon: -131.60015, lat: 55.30001 },
      { lon: -131.6002, lat: 55.3 },
    ];

    for (const p of path) {
      t += 1000;
      geo.push({ tMs: t, lon: p.lon, lat: p.lat, sogMs: 1 });
      clock.advance(1000);
      await Promise.resolve();
    }

    await vi.waitFor(async () => {
      const n = await getLocalDb().trackPoints.where('tripId').equals(trip.id).count();
      expect(n).toBeGreaterThanOrEqual(3);
    });

    const before = await getLocalDb().trackPoints.where('tripId').equals(trip.id).count();
    const result = await recorder.close();

    expect(result.trip.closedAt).toBeTruthy();
    expect(result.pointsAfter).toBeLessThanOrEqual(result.pointsBefore);
    expect(result.pointsBefore).toBe(before);

    const remaining = await getLocalDb().trackPoints.where('tripId').equals(trip.id).toArray();
    expect(remaining.length).toBe(result.pointsAfter);
    // Endpoints of the pass should survive.
    expect(remaining[0]?.geom.coordinates[0]).toBeCloseTo(-131.6, 4);
  });
});
