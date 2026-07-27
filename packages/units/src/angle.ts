import type { Brand } from './brand.js';

/** SI angle. Internal computation unit. */
export type Radians = Brand<number, 'Radians'>;

/** Degrees. UI / sensor edge. */
export type Degrees = Brand<number, 'Degrees'>;

export function radians(value: number): Radians {
  return value as Radians;
}

export function degrees(value: number): Degrees {
  return value as Degrees;
}

export function radiansToDegrees(value: Radians): Degrees {
  return degrees((value * 180) / Math.PI);
}

export function degreesToRadians(value: Degrees): Radians {
  return radians((value * Math.PI) / 180);
}
