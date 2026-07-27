import type { Brand } from './brand.js';

/** SI mass. Internal computation unit. */
export type Kilograms = Brand<number, 'Kilograms'>;

/** Avoirdupois pounds. UI edge only. */
export type Pounds = Brand<number, 'Pounds'>;

/** Exact by definition of the international avoirdupois pound. */
export const KILOGRAMS_PER_POUND = 0.45359237;

export function kilograms(value: number): Kilograms {
  return value as Kilograms;
}

export function pounds(value: number): Pounds {
  return value as Pounds;
}

export function kilogramsToPounds(value: Kilograms): Pounds {
  return pounds(value / KILOGRAMS_PER_POUND);
}

export function poundsToKilograms(value: Pounds): Kilograms {
  return kilograms(value * KILOGRAMS_PER_POUND);
}
