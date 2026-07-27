/**
 * Combined light context for recommendations — sun altitude + moon phase.
 * Computed locally; never fetched.
 */

import { moonPhase, type MoonPhase } from './moon.js';
import {
  CIVIL_TWILIGHT_ALT_DEG,
  lightLevelFromAltitude,
  solarDay,
  solarPosition,
  type SolarDay,
} from './solar.js';

export type LightContext = {
  readonly at: string;
  readonly lat: number;
  readonly lon: number;
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
  /** 0 = night below civil twilight, 1 = full daylight. */
  readonly lightLevel: number;
  readonly isCivilTwilight: boolean;
  readonly isDaylight: boolean;
  readonly moon: MoonPhase;
  readonly solar: SolarDay;
};

export function lightContext(
  lat: number,
  lon: number,
  instant: Date,
): LightContext {
  const sun = solarPosition(lat, lon, instant);
  const moon = moonPhase(instant);
  const solar = solarDay(lat, lon, instant);
  const lightLevel = lightLevelFromAltitude(sun.altitudeDeg);

  return {
    at: instant.toISOString(),
    lat,
    lon,
    sunAltitudeDeg: sun.altitudeDeg,
    sunAzimuthDeg: sun.azimuthDeg,
    lightLevel,
    isCivilTwilight:
      sun.altitudeDeg >= CIVIL_TWILIGHT_ALT_DEG && sun.altitudeDeg < 0,
    isDaylight: sun.altitudeDeg >= 0,
    moon,
    solar,
  };
}
