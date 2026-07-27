import { EARTH_RADIUS_M } from './constants.js';

export type LonLat = {
  readonly lon: number;
  readonly lat: number;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Approximate metres between two WGS84 points (equirectangular). */
export function distanceM(a: LonLat, b: LonLat): number {
  const lat0 = toRad((a.lat + b.lat) / 2);
  const dx = toRad(b.lon - a.lon) * Math.cos(lat0) * EARTH_RADIUS_M;
  const dy = toRad(b.lat - a.lat) * EARTH_RADIUS_M;
  return Math.hypot(dx, dy);
}

/** Perpendicular distance from point p to segment a→b, metres. */
export function perpendicularDistanceM(
  p: LonLat,
  a: LonLat,
  b: LonLat,
): number {
  const seg = distanceM(a, b);
  if (seg < 1e-6) return distanceM(p, a);

  const lat0 = toRad((a.lat + b.lat + p.lat) / 3);
  const ax = toRad(a.lon) * Math.cos(lat0) * EARTH_RADIUS_M;
  const ay = toRad(a.lat) * EARTH_RADIUS_M;
  const bx = toRad(b.lon) * Math.cos(lat0) * EARTH_RADIUS_M;
  const by = toRad(b.lat) * EARTH_RADIUS_M;
  const px = toRad(p.lon) * Math.cos(lat0) * EARTH_RADIUS_M;
  const py = toRad(p.lat) * EARTH_RADIUS_M;

  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
  );
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  return Math.hypot(px - qx, py - qy);
}

/**
 * Douglas-Peucker polyline simplification.
 * Keeps endpoints; drops vertices within `epsilonM` of the retained segments.
 */
export function douglasPeucker<T extends LonLat>(
  points: readonly T[],
  epsilonM: number,
): T[] {
  if (points.length <= 2) return [...points];
  if (epsilonM < 0) throw new Error('epsilonM must be >= 0');

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    const [start, end] = frame;
    const a = points[start];
    const b = points[end];
    if (a === undefined || b === undefined) continue;

    let maxDist = 0;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i += 1) {
      const p = points[i];
      if (p === undefined) continue;
      const d = perpendicularDistanceM(p, a, b);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxDist > epsilonM && maxIdx >= 0) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }

  const out: T[] = [];
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) {
      const p = points[i];
      if (p !== undefined) out.push(p);
    }
  }
  return out;
}
