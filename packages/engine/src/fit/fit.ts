/**
 * Per-user fitting first; pooled with per-user offset second.
 * Spec (03-recommendations.md): not before there is real effort data.
 */

import { FEATURE_NAMES, featuresFromContext } from './features.js';
import {
  predictGbt,
  trainGbt,
  type GradientBoostedModel,
  type TrainGbtOptions,
} from './gbt.js';
import type { RuleContext } from '../rules/types.js';

/** Spec: "~20 trips" before personal log outranks rules. */
export const MIN_TRIPS_FOR_USER_FIT = 20;

/** Need at least this many users with enough trips before pooled+offset. */
export const MIN_USERS_FOR_POOLED_FIT = 3;

export type FitRow = {
  readonly userId: string;
  readonly tripId: string;
  readonly ctx: RuleContext;
  /** Catches on the trip (0 allowed). */
  readonly catchCount: number;
  readonly durationHours: number;
};

export type FitGateFailure = {
  readonly ok: false;
  readonly reason: string;
  readonly tripCount: number;
  readonly required: number;
};

export type UserFitSuccess = {
  readonly ok: true;
  readonly userId: string;
  readonly tripCount: number;
  readonly model: GradientBoostedModel;
  readonly featureNames: typeof FEATURE_NAMES;
};

export type PooledFitSuccess = {
  readonly ok: true;
  readonly global: GradientBoostedModel;
  readonly userOffsets: ReadonlyMap<string, number>;
  readonly userCount: number;
  readonly tripCount: number;
  readonly featureNames: typeof FEATURE_NAMES;
};

function targetY(row: FitRow): number {
  if (row.durationHours <= 0) return 0;
  return row.catchCount / row.durationHours;
}

function matrix(rows: readonly FitRow[]): {
  X: number[][];
  y: number[];
} {
  const X: number[][] = [];
  const y: number[] = [];
  for (const row of rows) {
    if (row.durationHours <= 0) continue;
    X.push([...featuresFromContext(row.ctx).values]);
    y.push(targetY(row));
  }
  return { X, y };
}

export function canFitUser(
  rows: readonly FitRow[],
  userId: string,
): { ok: true; tripCount: number } | FitGateFailure {
  const userRows = rows.filter(
    (r) => r.userId === userId && r.durationHours > 0,
  );
  const tripCount = userRows.length;
  if (tripCount < MIN_TRIPS_FOR_USER_FIT) {
    return {
      ok: false,
      reason: `need ${MIN_TRIPS_FOR_USER_FIT} effort trips before per-user fit; have ${tripCount}`,
      tripCount,
      required: MIN_TRIPS_FOR_USER_FIT,
    };
  }
  // Zero-catch trips must still be present in the pool when they exist in input.
  return { ok: true, tripCount };
}

/** Fit a per-user GBT on catch-per-hour. Refuses without enough effort. */
export function fitPerUser(
  rows: readonly FitRow[],
  userId: string,
  options?: TrainGbtOptions,
): UserFitSuccess | FitGateFailure {
  const gate = canFitUser(rows, userId);
  if (!gate.ok) return gate;

  const userRows = rows.filter(
    (r) => r.userId === userId && r.durationHours > 0,
  );
  const { X, y } = matrix(userRows);
  const model = trainGbt(X, y, options);
  return {
    ok: true,
    userId,
    tripCount: userRows.length,
    model,
    featureNames: FEATURE_NAMES,
  };
}

export function canFitPooled(
  rows: readonly FitRow[],
): { ok: true; userCount: number; tripCount: number } | FitGateFailure {
  const byUser = new Map<string, number>();
  for (const r of rows) {
    if (r.durationHours <= 0) continue;
    byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + 1);
  }
  let eligible = 0;
  let tripCount = 0;
  for (const n of byUser.values()) {
    if (n >= MIN_TRIPS_FOR_USER_FIT) {
      eligible += 1;
      tripCount += n;
    }
  }
  if (eligible < MIN_USERS_FOR_POOLED_FIT) {
    return {
      ok: false,
      reason: `need ${MIN_USERS_FOR_POOLED_FIT} users with ≥${MIN_TRIPS_FOR_USER_FIT} trips each; have ${eligible}`,
      tripCount,
      required: MIN_USERS_FOR_POOLED_FIT,
    };
  }
  return { ok: true, userCount: eligible, tripCount };
}

/**
 * Global GBT + per-user additive offset (mean residual).
 * Only after multiple users have enough effort — regional pooling stays later.
 */
export function fitPooledWithUserOffset(
  rows: readonly FitRow[],
  options?: TrainGbtOptions,
): PooledFitSuccess | FitGateFailure {
  const gate = canFitPooled(rows);
  if (!gate.ok) return gate;

  const eligibleUsers = new Set<string>();
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.durationHours <= 0) continue;
    counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1);
  }
  for (const [uid, n] of counts) {
    if (n >= MIN_TRIPS_FOR_USER_FIT) eligibleUsers.add(uid);
  }

  const eligibleRows = rows.filter(
    (r) => eligibleUsers.has(r.userId) && r.durationHours > 0,
  );
  const { X, y } = matrix(eligibleRows);
  const global = trainGbt(X, y, options);

  const offsetSum = new Map<string, { sum: number; n: number }>();
  for (let i = 0; i < eligibleRows.length; i++) {
    const row = eligibleRows[i]!;
    const pred = predictGbt(global, X[i]!);
    const resid = y[i]! - pred;
    const acc = offsetSum.get(row.userId) ?? { sum: 0, n: 0 };
    acc.sum += resid;
    acc.n += 1;
    offsetSum.set(row.userId, acc);
  }

  const userOffsets = new Map<string, number>();
  for (const [uid, acc] of offsetSum) {
    userOffsets.set(uid, acc.sum / acc.n);
  }

  return {
    ok: true,
    global,
    userOffsets,
    userCount: eligibleUsers.size,
    tripCount: eligibleRows.length,
    featureNames: FEATURE_NAMES,
  };
}

export function predictPersonal(
  model: GradientBoostedModel,
  ctx: RuleContext,
  userOffset = 0,
): number {
  return predictGbt(model, featuresFromContext(ctx).values) + userOffset;
}
