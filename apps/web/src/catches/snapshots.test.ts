import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS } from '../routes/calculator/types.js';
import { snapshotAtCatch } from './snapshots.js';

describe('snapshotAtCatch', () => {
  it('freezes rig and depth including assumptions', () => {
    const { rigSnapshot, depthSnapshot } = snapshotAtCatch({
      rigInputs: DEFAULT_INPUTS,
      position: {
        tMs: Date.now(),
        lon: -131.6,
        lat: 55.3,
        sogMs: 1.3,
      },
    });

    expect(rigSnapshot.delivery).toBe('DOWNRIGGER');
    expect(typeof depthSnapshot.depthM).toBe('number');
    expect(Array.isArray(depthSnapshot.assumptions)).toBe(true);
    expect(
      (depthSnapshot.assumptions as string[]).some((a) =>
        a.includes('no current correction'),
      ),
    ).toBe(true);
  });

  it('uses measured STW when the live sample carries it', () => {
    const { depthSnapshot } = snapshotAtCatch({
      rigInputs: DEFAULT_INPUTS,
      position: {
        tMs: Date.now(),
        lon: -131.6,
        lat: 55.3,
        stwMs: 1.3,
      },
    });
    expect(depthSnapshot.confidence).toBe('measured');
    expect(depthSnapshot.stwSource).toBe('paddle_wheel');
  });
});
