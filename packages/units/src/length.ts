import type { Brand } from './brand.js';

/** SI length. Internal computation unit. */
export type Meters = Brand<number, 'Meters'>;

/** Imperial length. UI edge only. */
export type Feet = Brand<number, 'Feet'>;

/** International foot: exactly 0.3048 m (CIPM 1959 / NIST). */
export const METERS_PER_FOOT = 0.3048;

export function meters(value: number): Meters {
  return value as Meters;
}

export function feet(value: number): Feet {
  return value as Feet;
}

export function metersToFeet(value: Meters): Feet {
  return feet(value / METERS_PER_FOOT);
}

export function feetToMeters(value: Feet): Meters {
  return meters(value * METERS_PER_FOOT);
}
