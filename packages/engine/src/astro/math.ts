/** Degrees ↔ radians helpers for astronomy routines. */

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeDegrees(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** Julian Date (UTC) from a Date. */
export function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

/** Julian centuries since J2000.0. */
export function julianCentury(jd: number): number {
  return (jd - 2_451_545.0) / 36_525.0;
}
