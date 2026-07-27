import type { Brand } from './brand.js';

/** SI speed. Internal computation unit. */
export type MetersPerSecond = Brand<number, 'MetersPerSecond'>;

/** Nautical speed. UI edge only. */
export type Knots = Brand<number, 'Knots'>;

/**
 * One international knot = one nautical mile per hour.
 * Nautical mile is exactly 1852 m (IHO / BIPM).
 */
export const METERS_PER_SECOND_PER_KNOT = 1852 / 3600;

export function metersPerSecond(value: number): MetersPerSecond {
  return value as MetersPerSecond;
}

export function knots(value: number): Knots {
  return value as Knots;
}

export function metersPerSecondToKnots(value: MetersPerSecond): Knots {
  return knots(value / METERS_PER_SECOND_PER_KNOT);
}

export function knotsToMetersPerSecond(value: Knots): MetersPerSecond {
  return metersPerSecond(value * METERS_PER_SECOND_PER_KNOT);
}
