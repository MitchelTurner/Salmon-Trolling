import { describe, expect, it } from 'vitest';
import type { RuleContext } from '../rules/types.js';
import {
  MIN_TRIPS_FOR_USER_FIT,
  MIN_USERS_FOR_POOLED_FIT,
  canFitUser,
  fitPerUser,
  fitPooledWithUserOffset,
  predictPersonal,
  type FitRow,
} from './fit.js';
import { FEATURE_NAMES, featuresFromContext } from './features.js';
import { predictGbt, trainGbt } from './gbt.js';

function ctx(partial: Partial<RuleContext> & Pick<RuleContext, 'lightLevel'>): RuleContext {
  return {
    turbidity: 0.2,
    weekOfYear: 24,
    ...partial,
  };
}

function rowsForUser(
  userId: string,
  n: number,
  opts?: { zeroEvery?: number },
): FitRow[] {
  const out: FitRow[] = [];
  for (let i = 0; i < n; i++) {
    const light = i / Math.max(1, n - 1);
    const catchCount =
      opts?.zeroEvery && i % opts.zeroEvery === 0
        ? 0
        : light < 0.3
          ? 2
          : 0;
    out.push({
      userId,
      tripId: `${userId}-${i}`,
      ctx: ctx({ lightLevel: light, turbidity: 0.2 + (i % 5) * 0.05 }),
      catchCount,
      durationHours: 2,
    });
  }
  return out;
}

describe('fitting data gate', () => {
  it(`refuses per-user fit before ${MIN_TRIPS_FOR_USER_FIT} effort trips`, () => {
    const rows = rowsForUser('u1', MIN_TRIPS_FOR_USER_FIT - 1);
    const gate = canFitUser(rows, 'u1');
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.tripCount).toBe(MIN_TRIPS_FOR_USER_FIT - 1);
    }
    const fit = fitPerUser(rows, 'u1');
    expect(fit.ok).toBe(false);
  });

  it('fits per-user once enough effort exists (including zero-catch trips)', () => {
    const rows = rowsForUser('u1', MIN_TRIPS_FOR_USER_FIT, { zeroEvery: 3 });
    expect(rows.some((r) => r.catchCount === 0)).toBe(true);

    const fit = fitPerUser(rows, 'u1', { iterations: 15, learningRate: 0.15 });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;

    expect(fit.tripCount).toBe(MIN_TRIPS_FOR_USER_FIT);
    expect(fit.featureNames).toEqual(FEATURE_NAMES);

    const lowLight = predictPersonal(fit.model, ctx({ lightLevel: 0.1 }));
    const highLight = predictPersonal(fit.model, ctx({ lightLevel: 0.9 }));
    // Synthetic data: more catches at low light — model should reflect direction.
    expect(lowLight).toBeGreaterThan(highLight);
  });
});

describe('pooled + per-user offset', () => {
  it('refuses pooled fit without enough eligible users', () => {
    const rows = [
      ...rowsForUser('u1', MIN_TRIPS_FOR_USER_FIT),
      ...rowsForUser('u2', MIN_TRIPS_FOR_USER_FIT),
    ];
    expect(MIN_USERS_FOR_POOLED_FIT).toBeGreaterThan(2);
    const fit = fitPooledWithUserOffset(rows);
    expect(fit.ok).toBe(false);
  });

  it('fits global model with per-user offsets when gated', () => {
    const u3 = rowsForUser('u3', MIN_TRIPS_FOR_USER_FIT, { zeroEvery: 4 }).map(
      (r) => ({
        ...r,
        // Systematically higher CPUE for this angler.
        catchCount: r.catchCount === 0 ? 0 : r.catchCount + 2,
      }),
    );
    const rows = [
      ...rowsForUser('u1', MIN_TRIPS_FOR_USER_FIT, { zeroEvery: 4 }),
      ...rowsForUser('u2', MIN_TRIPS_FOR_USER_FIT, { zeroEvery: 4 }),
      ...u3,
    ];

    const fit = fitPooledWithUserOffset(rows, {
      iterations: 12,
      learningRate: 0.15,
    });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    expect(fit.userCount).toBe(3);
    expect(fit.userOffsets.has('u3')).toBe(true);
  });
});

describe('gbt smoke', () => {
  it('predicts training mean for constant target', () => {
    const X = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    const y = [2, 2, 2, 2];
    const model = trainGbt(X, y, { iterations: 5 });
    expect(predictGbt(model, [0.5, 0.5])).toBeCloseTo(2, 5);
  });

  it('encodes a stable feature width', () => {
    const v = featuresFromContext(ctx({ lightLevel: 0.5 }));
    expect(v.values).toHaveLength(FEATURE_NAMES.length);
  });
});
