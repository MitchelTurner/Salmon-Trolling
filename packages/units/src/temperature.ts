import type { Brand } from './brand.js';

/** SI temperature. Internal computation unit. */
export type Celsius = Brand<number, 'Celsius'>;

/** Imperial temperature. UI edge only. */
export type Fahrenheit = Brand<number, 'Fahrenheit'>;

export function celsius(value: number): Celsius {
  return value as Celsius;
}

export function fahrenheit(value: number): Fahrenheit {
  return value as Fahrenheit;
}

export function celsiusToFahrenheit(value: Celsius): Fahrenheit {
  return fahrenheit((value * 9) / 5 + 32);
}

export function fahrenheitToCelsius(value: Fahrenheit): Celsius {
  return celsius(((value - 32) * 5) / 9);
}
