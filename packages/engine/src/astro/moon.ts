/**
 * Lunar phase and illumination — pure local computation, no network.
 * Phase angle from mean elongations (Meeus-style approximation).
 */

import { degToRad, julianDate, normalizeDegrees } from './math.js';

export type MoonPhaseName =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export type MoonPhase = {
  /** Phase angle in degrees (0 = new, 180 = full). */
  readonly phaseAngleDeg: number;
  /** Illuminated fraction 0..1. */
  readonly illumination: number;
  /** Age in days since new moon (0..~29.53). */
  readonly ageDays: number;
  readonly phase: MoonPhaseName;
};

const SYNODIC_MONTH_DAYS = 29.530588853;

function moonPhaseName(phaseAngleDeg: number): MoonPhaseName {
  const a = normalizeDegrees(phaseAngleDeg);
  if (a < 22.5 || a >= 337.5) return 'new';
  if (a < 67.5) return 'waxing_crescent';
  if (a < 112.5) return 'first_quarter';
  if (a < 157.5) return 'waxing_gibbous';
  if (a < 202.5) return 'full';
  if (a < 247.5) return 'waning_gibbous';
  if (a < 292.5) return 'last_quarter';
  return 'waning_crescent';
}

/**
 * Approximate moon phase at an instant (UTC).
 * Good enough for recommendation light context; not an ephemeris.
 */
export function moonPhase(instant: Date): MoonPhase {
  const jd = julianDate(instant);
  // Days since known new moon: 2000-01-06 18:14 UTC
  const daysSinceNew = jd - 2_451_550.09765;
  const ageDays =
    ((daysSinceNew % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) %
    SYNODIC_MONTH_DAYS;
  const phaseAngleDeg = normalizeDegrees((ageDays / SYNODIC_MONTH_DAYS) * 360);
  const illumination =
    0.5 * (1 - Math.cos(degToRad(phaseAngleDeg)));

  return {
    phaseAngleDeg,
    illumination,
    ageDays,
    phase: moonPhaseName(phaseAngleDeg),
  };
}
