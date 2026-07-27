import { describe, expectTypeOf, it } from 'vitest';
import {
  type Celsius,
  type Degrees,
  type Fahrenheit,
  type Feet,
  type Kilograms,
  type Knots,
  type Meters,
  type MetersPerSecond,
  type Newtons,
  type Pounds,
  type Radians,
  celsius,
  degrees,
  fahrenheit,
  feet,
  kilograms,
  knots,
  meters,
  metersPerSecond,
  newtons,
  pounds,
  radians,
} from './index.js';

describe('branded unit assignability', () => {
  it('rejects bare numbers at the type level', () => {
    expectTypeOf(1).not.toMatchTypeOf<Meters>();
    expectTypeOf(1).not.toMatchTypeOf<Feet>();
    expectTypeOf(1).not.toMatchTypeOf<MetersPerSecond>();
    expectTypeOf(1).not.toMatchTypeOf<Knots>();
    expectTypeOf(1).not.toMatchTypeOf<Kilograms>();
    expectTypeOf(1).not.toMatchTypeOf<Pounds>();
    expectTypeOf(1).not.toMatchTypeOf<Newtons>();
    expectTypeOf(1).not.toMatchTypeOf<Celsius>();
    expectTypeOf(1).not.toMatchTypeOf<Fahrenheit>();
    expectTypeOf(1).not.toMatchTypeOf<Radians>();
    expectTypeOf(1).not.toMatchTypeOf<Degrees>();
  });

  it('accepts factory results as their branded types', () => {
    expectTypeOf(meters(1)).toEqualTypeOf<Meters>();
    expectTypeOf(feet(1)).toEqualTypeOf<Feet>();
    expectTypeOf(metersPerSecond(1)).toEqualTypeOf<MetersPerSecond>();
    expectTypeOf(knots(1)).toEqualTypeOf<Knots>();
    expectTypeOf(kilograms(1)).toEqualTypeOf<Kilograms>();
    expectTypeOf(pounds(1)).toEqualTypeOf<Pounds>();
    expectTypeOf(newtons(1)).toEqualTypeOf<Newtons>();
    expectTypeOf(celsius(1)).toEqualTypeOf<Celsius>();
    expectTypeOf(fahrenheit(1)).toEqualTypeOf<Fahrenheit>();
    expectTypeOf(radians(1)).toEqualTypeOf<Radians>();
    expectTypeOf(degrees(1)).toEqualTypeOf<Degrees>();
  });

  it('keeps distinct unit brands incompatible', () => {
    expectTypeOf(meters(1)).not.toMatchTypeOf<Feet>();
    expectTypeOf(meters(1)).not.toMatchTypeOf<Kilograms>();
    expectTypeOf(metersPerSecond(1)).not.toMatchTypeOf<Knots>();
    expectTypeOf(celsius(1)).not.toMatchTypeOf<Fahrenheit>();
    expectTypeOf(radians(1)).not.toMatchTypeOf<Degrees>();
  });
});
