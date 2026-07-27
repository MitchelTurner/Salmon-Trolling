import { describe, expect, it } from 'vitest';
import { ingestProbeSession, nearestTrackPoint, rigAt } from './ingest.js';

describe('probe sample ingest', () => {
  it('applies clock offset at ingest', () => {
    const ingested = ingestProbeSession({
      sessionStartedAt: '2026-07-27T14:00:00.000Z',
      clockOffsetMs: 1500,
      samples: [
        { tOffsetMs: 0, depthM: 12, tempC: 8 },
        { tOffsetMs: 1000, depthM: 12.5, tempC: 8.1 },
      ],
      track: [],
      rigTimeline: [],
    });

    expect(ingested[0]?.t).toBe('2026-07-27T14:00:01.500Z');
    expect(ingested[1]?.t).toBe('2026-07-27T14:00:02.500Z');
    expect(ingested[0]?.clockOffsetMs).toBe(1500);
  });

  it('joins nearest track point and active rig', () => {
    const ingested = ingestProbeSession({
      sessionStartedAt: '2026-07-27T14:00:00.000Z',
      clockOffsetMs: 0,
      samples: [{ tOffsetMs: 2000, depthM: 20, speedMs: 1.3 }],
      track: [
        {
          t: '2026-07-27T14:00:01.000Z',
          lat: 55.34,
          lon: -131.65,
        },
        {
          t: '2026-07-27T14:00:02.200Z',
          lat: 55.341,
          lon: -131.651,
        },
      ],
      rigTimeline: [
        {
          from: '2026-07-27T13:00:00.000Z',
          to: '2026-07-27T15:00:00.000Z',
          rigSnapshot: { delivery: 'DOWNRIGGER', name: 'DR1' },
        },
      ],
    });

    expect(ingested[0]?.lat).toBeCloseTo(55.341, 5);
    expect(ingested[0]?.rigSnapshot).toEqual({
      delivery: 'DOWNRIGGER',
      name: 'DR1',
    });
  });

  it('nearestTrackPoint respects max delta', () => {
    const hit = nearestTrackPoint(
      [{ t: '2026-07-27T14:00:00.000Z', lat: 1, lon: 2 }],
      Date.parse('2026-07-27T14:00:03.000Z'),
      5_000,
    );
    expect(hit?.lat).toBe(1);
    const miss = nearestTrackPoint(
      [{ t: '2026-07-27T14:00:00.000Z', lat: 1, lon: 2 }],
      Date.parse('2026-07-27T14:00:10.000Z'),
      5_000,
    );
    expect(miss).toBeNull();
  });

  it('rigAt picks the covering timeline entry', () => {
    const snap = rigAt(
      [
        {
          from: '2026-07-27T14:00:00.000Z',
          to: '2026-07-27T14:30:00.000Z',
          rigSnapshot: { name: 'A' },
        },
        {
          from: '2026-07-27T14:30:00.000Z',
          rigSnapshot: { name: 'B' },
        },
      ],
      Date.parse('2026-07-27T14:45:00.000Z'),
    );
    expect(snap).toEqual({ name: 'B' });
  });
});
