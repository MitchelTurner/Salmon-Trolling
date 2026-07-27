/**
 * Single formatting boundary: SI in, display units out.
 * No ad-hoc unit math in components.
 */
import {
  KILOGRAMS_PER_POUND,
  METERS_PER_FOOT,
  METERS_PER_SECOND_PER_KNOT,
  type Kilograms,
  type Meters,
  type MetersPerSecond,
  type Newtons,
  type Radians,
} from '@troll/units';

export type DisplayUnits = {
  readonly length: 'ft' | 'm';
  readonly speed: 'kt' | 'm/s';
  readonly mass: 'lb' | 'kg';
};

export const DEFAULT_DISPLAY_UNITS: DisplayUnits = {
  length: 'ft',
  speed: 'kt',
  mass: 'lb',
};

export function metersToFeet(m: number): number {
  return m / METERS_PER_FOOT;
}

export function feetToMeters(ft: number): number {
  return ft * METERS_PER_FOOT;
}

export function mpsToKnots(mps: number): number {
  return mps / METERS_PER_SECOND_PER_KNOT;
}

export function knotsToMps(kt: number): number {
  return kt * METERS_PER_SECOND_PER_KNOT;
}

export function formatLength(
  value: Meters | number,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
  digits = 1,
): string {
  if (units.length === 'ft') {
    return `${metersToFeet(value).toFixed(digits)} ft`;
  }
  return `${Number(value).toFixed(digits)} m`;
}

export function formatSpeed(
  value: MetersPerSecond | number,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
  digits = 1,
): string {
  if (units.speed === 'kt') {
    return `${mpsToKnots(value).toFixed(digits)} kt`;
  }
  return `${Number(value).toFixed(digits)} m/s`;
}

export function formatForce(value: Newtons | number, digits = 1): string {
  return `${Number(value).toFixed(digits)} N`;
}

export function kgToPounds(kg: number): number {
  return kg / KILOGRAMS_PER_POUND;
}

export function poundsToKg(lb: number): number {
  return lb * KILOGRAMS_PER_POUND;
}

export function formatMass(
  value: Kilograms | number,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
  digits = 1,
): string {
  if (units.mass === 'lb') {
    return `${kgToPounds(value).toFixed(digits)} lb`;
  }
  return `${Number(value).toFixed(digits)} kg`;
}

export function parseMassInput(
  raw: string,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return units.mass === 'lb' ? poundsToKg(n) : n;
}

export function massInputValue(
  kgValue: number,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
): string {
  const v = units.mass === 'lb' ? kgToPounds(kgValue) : kgValue;
  return String(Math.round(v * 10) / 10);
}

export function formatAngleDeg(value: Radians | number, digits = 0): string {
  return `${((Number(value) * 180) / Math.PI).toFixed(digits)}°`;
}

/** Split a length into sounding-style integer + tenths for the depth column. */
export function soundingParts(
  valueM: Meters | number,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
): { int: string; tenths: string; unit: string } {
  const display =
    units.length === 'ft' ? metersToFeet(valueM) : Number(valueM);
  const rounded = Math.round(display * 10) / 10;
  const int = Math.trunc(rounded).toString();
  const tenths = Math.abs(Math.round((rounded % 1) * 10)).toString();
  return { int, tenths, unit: units.length };
}

export function parseLengthInput(
  raw: string,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return units.length === 'ft' ? feetToMeters(n) : n;
}

export function parseSpeedInput(
  raw: string,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return units.speed === 'kt' ? knotsToMps(n) : n;
}

export function lengthInputValue(
  metersValue: number,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
): string {
  const v =
    units.length === 'ft' ? metersToFeet(metersValue) : metersValue;
  return String(Math.round(v * 10) / 10);
}

export function speedInputValue(
  mpsValue: number,
  units: DisplayUnits = DEFAULT_DISPLAY_UNITS,
): string {
  const v = units.speed === 'kt' ? mpsToKnots(mpsValue) : mpsValue;
  return String(Math.round(v * 10) / 10);
}
