import { describe, expect, it } from 'vitest';
import { douglasPeucker, perpendicularDistanceM } from './douglas-peucker.js';

describe('douglasPeucker', () => {
  it('keeps endpoints of a straight line and drops midpoints', () => {
    const points = [
      { lon: 0, lat: 0, id: 'a' },
      { lon: 0.0001, lat: 0, id: 'b' },
      { lon: 0.0002, lat: 0, id: 'c' },
      { lon: 0.0003, lat: 0, id: 'd' },
    ];
    const simplified = douglasPeucker(points, 5);
    expect(simplified.map((p) => p.id)).toEqual(['a', 'd']);
  });

  it('keeps a vertex that bends beyond epsilon', () => {
    const points = [
      { lon: 0, lat: 0, id: 'a' },
      { lon: 0.001, lat: 0.001, id: 'b' }, // ~157 m offset from chord
      { lon: 0.002, lat: 0, id: 'c' },
    ];
    const simplified = douglasPeucker(points, 5);
    expect(simplified.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('measures perpendicular distance in metres', () => {
    const d = perpendicularDistanceM(
      { lon: 0.001, lat: 0.001 },
      { lon: 0, lat: 0 },
      { lon: 0.002, lat: 0 },
    );
    expect(d).toBeGreaterThan(50);
  });
});
