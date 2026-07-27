/**
 * Solar position and rise/set times — pure local computation, no network.
 * Algorithms adapted from the NOAA Solar Calculator / Astronomical Almanac.
 */

import {
  degToRad,
  julianCentury,
  julianDate,
  normalizeDegrees,
  radToDeg,
} from './math.js';

export type SolarPosition = {
  readonly altitudeDeg: number;
  readonly azimuthDeg: number;
  /** True solar elevation before refraction correction. */
  readonly elevationDeg: number;
};

export type SolarDay = {
  readonly dateUtc: string;
  readonly lat: number;
  readonly lon: number;
  readonly solarNoon: string;
  readonly sunrise: string | null;
  readonly sunset: string | null;
  /** Sun altitude −6° (civil twilight start, morning). */
  readonly civilDawn: string | null;
  /** Sun altitude −6° (civil twilight end, evening). */
  readonly civilDusk: string | null;
};

function geomMeanLongSunDeg(t: number): number {
  return normalizeDegrees(280.46646 + t * (36000.76983 + t * 0.0003032));
}

function geomMeanAnomalySunDeg(t: number): number {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

function eccentricityEarthOrbit(t: number): number {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

function sunEqOfCenterDeg(t: number): number {
  const m = degToRad(geomMeanAnomalySunDeg(t));
  return (
    Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289
  );
}

function sunTrueLongDeg(t: number): number {
  return geomMeanLongSunDeg(t) + sunEqOfCenterDeg(t);
}

function sunAppLongDeg(t: number): number {
  const omega = degToRad(125.04 - 1934.136 * t);
  return sunTrueLongDeg(t) - 0.00569 - 0.00478 * Math.sin(omega);
}

function meanObliquityDeg(t: number): number {
  return (
    23 +
    (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  );
}

function obliquityCorrectionDeg(t: number): number {
  const omega = degToRad(125.04 - 1934.136 * t);
  return meanObliquityDeg(t) + 0.00256 * Math.cos(omega);
}

function sunDeclinationDeg(t: number): number {
  const e = degToRad(obliquityCorrectionDeg(t));
  const lambda = degToRad(sunAppLongDeg(t));
  return radToDeg(Math.asin(Math.sin(e) * Math.sin(lambda)));
}

function equationOfTimeMinutes(t: number): number {
  const epsilon = degToRad(obliquityCorrectionDeg(t));
  const l0 = degToRad(geomMeanLongSunDeg(t));
  const e = eccentricityEarthOrbit(t);
  const m = degToRad(geomMeanAnomalySunDeg(t));
  const y = Math.tan(epsilon / 2) ** 2;
  const eqTime =
    y * Math.sin(2 * l0) -
    2 * e * Math.sin(m) +
    4 * e * y * Math.sin(m) * Math.cos(2 * l0) -
    0.5 * y * y * Math.sin(4 * l0) -
    1.25 * e * e * Math.sin(2 * m);
  return 4 * radToDeg(eqTime);
}

function hourAngleDeg(
  lat: number,
  decl: number,
  altitudeDeg: number,
): number | null {
  const latR = degToRad(lat);
  const declR = degToRad(decl);
  const cosH =
    (Math.sin(degToRad(altitudeDeg)) - Math.sin(latR) * Math.sin(declR)) /
    (Math.cos(latR) * Math.cos(declR));
  if (cosH > 1) return null; // sun never reaches altitude (always below)
  if (cosH < -1) return null; // sun never sets below altitude (always above)
  return radToDeg(Math.acos(cosH));
}

function timeAtHourAngle(
  date: Date,
  lon: number,
  eqTimeMin: number,
  hourAngleDegValue: number,
): Date {
  // Solar noon in minutes from midnight UTC, then ± hour angle.
  const solarNoonMin = 720 - 4 * lon - eqTimeMin;
  const minutes = solarNoonMin + hourAngleDegValue * 4;
  const dayStart = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return new Date(dayStart + minutes * 60_000);
}

/**
 * Topocentric solar position at an instant (UTC).
 * Azimuth: degrees from north, clockwise.
 */
export function solarPosition(
  lat: number,
  lon: number,
  instant: Date,
): SolarPosition {
  const jd = julianDate(instant);
  const t = julianCentury(jd);
  const decl = sunDeclinationDeg(t);
  const eqTime = equationOfTimeMinutes(t);

  const minutes =
    instant.getUTCHours() * 60 +
    instant.getUTCMinutes() +
    instant.getUTCSeconds() / 60;
  const trueSolarTime = (minutes + eqTime + 4 * lon) % 1440;
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latR = degToRad(lat);
  const declR = degToRad(decl);
  const haR = degToRad(hourAngle);
  const zenith = radToDeg(
    Math.acos(
      Math.sin(latR) * Math.sin(declR) +
        Math.cos(latR) * Math.cos(declR) * Math.cos(haR),
    ),
  );
  const elevation = 90 - zenith;

  // Rough refraction correction near the horizon.
  let refraction = 0;
  if (elevation > 85) {
    refraction = 0;
  } else if (elevation > 5) {
    refraction =
      58.1 / Math.tan(degToRad(elevation)) -
      0.07 / Math.tan(degToRad(elevation)) ** 3 +
      0.000086 / Math.tan(degToRad(elevation)) ** 5;
  } else if (elevation > -0.575) {
    refraction =
      1735 +
      elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
  } else {
    refraction = -20.774 / Math.tan(degToRad(elevation));
  }
  refraction /= 3600;
  const altitude = elevation + refraction;

  const azDenom =
    Math.cos(latR) * Math.sin(degToRad(zenith));
  let azimuth: number;
  if (Math.abs(azDenom) > 0.001) {
    const azRad = Math.acos(
      ((Math.sin(latR) * Math.cos(degToRad(zenith))) - Math.sin(declR)) /
        azDenom,
    );
    azimuth =
      hourAngle > 0
        ? normalizeDegrees(radToDeg(azRad) + 180)
        : normalizeDegrees(540 - radToDeg(azRad));
  } else {
    azimuth = lat > 0 ? 180 : 0;
  }

  return {
    altitudeDeg: altitude,
    azimuthDeg: azimuth,
    elevationDeg: elevation,
  };
}

/** Civil twilight altitude threshold (degrees). */
export const CIVIL_TWILIGHT_ALT_DEG = -6;
/** Geometric sunrise/sunset with standard refraction. */
export const SUNRISE_ALT_DEG = -0.833;

/**
 * Sunrise, sunset, and civil twilight for a UTC calendar day.
 * Nulls when the event does not occur (polar day/night).
 */
export function solarDay(lat: number, lon: number, date: Date): SolarDay {
  const noon = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12),
  );
  const t = julianCentury(julianDate(noon));
  const decl = sunDeclinationDeg(t);
  const eqTime = equationOfTimeMinutes(t);

  const haRise = hourAngleDeg(lat, decl, SUNRISE_ALT_DEG);
  const haCivil = hourAngleDeg(lat, decl, CIVIL_TWILIGHT_ALT_DEG);

  const solarNoon = timeAtHourAngle(date, lon, eqTime, 0);

  return {
    dateUtc: noon.toISOString().slice(0, 10),
    lat,
    lon,
    solarNoon: solarNoon.toISOString(),
    sunrise:
      haRise === null
        ? null
        : timeAtHourAngle(date, lon, eqTime, -haRise).toISOString(),
    sunset:
      haRise === null
        ? null
        : timeAtHourAngle(date, lon, eqTime, haRise).toISOString(),
    civilDawn:
      haCivil === null
        ? null
        : timeAtHourAngle(date, lon, eqTime, -haCivil).toISOString(),
    civilDusk:
      haCivil === null
        ? null
        : timeAtHourAngle(date, lon, eqTime, haCivil).toISOString(),
  };
}

/** Simple 0..1 light proxy from solar altitude (for recommendation rules). */
export function lightLevelFromAltitude(altitudeDeg: number): number {
  if (altitudeDeg >= 10) return 1;
  if (altitudeDeg <= CIVIL_TWILIGHT_ALT_DEG) return 0;
  if (altitudeDeg >= 0) {
    return 0.55 + (0.45 * altitudeDeg) / 10;
  }
  // Civil twilight band −6..0
  return 0.55 * (1 + altitudeDeg / 6);
}
