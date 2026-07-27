import { describe, expect, it } from 'vitest';
import {
  celsius,
  celsiusToFahrenheit,
  degrees,
  degreesToRadians,
  fahrenheit,
  fahrenheitToCelsius,
  feet,
  feetToMeters,
  kilograms,
  kilogramsToPounds,
  knots,
  knotsToMetersPerSecond,
  meters,
  metersPerSecond,
  metersPerSecondToKnots,
  metersToFeet,
  pounds,
  poundsToKilograms,
  radians,
  radiansToDegrees,
} from './index.js';

describe('known conversion anchors', () => {
  it('converts a meter to feet', () => {
    expect(metersToFeet(meters(1))).toBeCloseTo(3.280839895, 9);
  });

  it('uses the exact international foot', () => {
    expect(feetToMeters(feet(1))).toBe(0.3048);
  });

  it('converts knots via the international nautical mile', () => {
    expect(knotsToMetersPerSecond(knots(1))).toBeCloseTo(1852 / 3600, 12);
    expect(metersPerSecondToKnots(metersPerSecond(1852 / 3600))).toBeCloseTo(1, 12);
  });

  it('uses the exact avoirdupois pound', () => {
    expect(poundsToKilograms(pounds(1))).toBe(0.45359237);
    expect(kilogramsToPounds(kilograms(0.45359237))).toBeCloseTo(1, 12);
  });

  it('converts freezing and boiling points', () => {
    expect(celsiusToFahrenheit(celsius(0))).toBe(32);
    expect(celsiusToFahrenheit(celsius(100))).toBe(212);
    expect(fahrenheitToCelsius(fahrenheit(32))).toBe(0);
    expect(fahrenheitToCelsius(fahrenheit(212))).toBe(100);
  });

  it('converts a right angle', () => {
    expect(degreesToRadians(degrees(180))).toBeCloseTo(Math.PI, 12);
    expect(radiansToDegrees(radians(Math.PI))).toBeCloseTo(180, 12);
  });
});
