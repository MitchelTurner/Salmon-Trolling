import { describe, it } from 'vitest';
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
import { expectClose, forAllNumbers } from './testing.js';

describe('unit conversion round-trips', () => {
  it('meters ↔ feet', () => {
    forAllNumbers((n) => {
      const m = meters(n);
      expectClose(feetToMeters(metersToFeet(m)), m);
      const f = feet(n);
      expectClose(metersToFeet(feetToMeters(f)), f);
    });
  });

  it('metersPerSecond ↔ knots', () => {
    forAllNumbers((n) => {
      const mps = metersPerSecond(n);
      expectClose(knotsToMetersPerSecond(metersPerSecondToKnots(mps)), mps);
      const k = knots(n);
      expectClose(metersPerSecondToKnots(knotsToMetersPerSecond(k)), k);
    });
  });

  it('kilograms ↔ pounds', () => {
    forAllNumbers((n) => {
      const kg = kilograms(n);
      expectClose(poundsToKilograms(kilogramsToPounds(kg)), kg);
      const lb = pounds(n);
      expectClose(kilogramsToPounds(poundsToKilograms(lb)), lb);
    });
  });

  it('celsius ↔ fahrenheit', () => {
    forAllNumbers(
      (n) => {
        const c = celsius(n);
        expectClose(fahrenheitToCelsius(celsiusToFahrenheit(c)), c);
        const f = fahrenheit(n);
        expectClose(celsiusToFahrenheit(fahrenheitToCelsius(f)), f);
      },
      { min: -273.15, max: 1e4 },
    );
  });

  it('radians ↔ degrees', () => {
    forAllNumbers((n) => {
      const r = radians(n);
      expectClose(degreesToRadians(radiansToDegrees(r)), r);
      const d = degrees(n);
      expectClose(radiansToDegrees(degreesToRadians(d)), d);
    });
  });
});
