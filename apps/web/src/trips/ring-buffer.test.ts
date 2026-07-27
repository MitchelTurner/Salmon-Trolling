import { describe, expect, it } from 'vitest';
import { RingBuffer } from './ring-buffer.js';

describe('RingBuffer', () => {
  it('keeps the newest N items', () => {
    const ring = new RingBuffer<number>(3);
    ring.push(1);
    ring.push(2);
    ring.push(3);
    ring.push(4);
    expect(ring.toArray()).toEqual([2, 3, 4]);
    expect(ring.latest()).toBe(4);
  });

  it('reports length before wrapping', () => {
    const ring = new RingBuffer<string>(5);
    ring.push('a');
    expect(ring.length).toBe(1);
    expect(ring.toArray()).toEqual(['a']);
  });
});
