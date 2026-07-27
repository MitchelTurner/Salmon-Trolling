import type { Brand } from './brand.js';

/** SI force. Internal computation unit. */
export type Newtons = Brand<number, 'Newtons'>;

export function newtons(value: number): Newtons {
  return value as Newtons;
}
