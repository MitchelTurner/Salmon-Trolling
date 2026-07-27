/** Web Mercator XYZ helpers for vector tile covering. */

export type TileCoord = { readonly z: number; readonly x: number; readonly y: number };

export type TileBBox = {
  readonly minLon: number;
  readonly minLat: number;
  readonly maxLon: number;
  readonly maxLat: number;
};

export function lonLatToTile(
  lon: number,
  lat: number,
  z: number,
): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return {
    x: Math.min(n - 1, Math.max(0, x)),
    y: Math.min(n - 1, Math.max(0, y)),
  };
}

export function tileBBox(z: number, x: number, y: number): TileBBox {
  const n = 2 ** z;
  const minLon = (x / n) * 360 - 180;
  const maxLon = ((x + 1) / n) * 360 - 180;
  const maxLat = mercatorYToLat(y / n);
  const minLat = mercatorYToLat((y + 1) / n);
  return { minLon, minLat, maxLon, maxLat };
}

function mercatorYToLat(yNorm: number): number {
  const n = Math.PI - 2 * Math.PI * yNorm;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function tilesCoveringBBox(
  bbox: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
  },
  z: number,
): TileCoord[] {
  const nw = lonLatToTile(bbox.minLon, bbox.maxLat, z);
  const se = lonLatToTile(bbox.maxLon, bbox.minLat, z);
  const tiles: TileCoord[] = [];
  for (let x = nw.x; x <= se.x; x += 1) {
    for (let y = nw.y; y <= se.y; y += 1) {
      tiles.push({ z, x, y });
    }
  }
  return tiles;
}

export function bboxesIntersect(
  a: TileBBox,
  b: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
  },
): boolean {
  return !(
    a.maxLon < b.minLon ||
    a.minLon > b.maxLon ||
    a.maxLat < b.minLat ||
    a.minLat > b.maxLat
  );
}

export function lineBBox(coords: ReadonlyArray<readonly [number, number]>): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLon, minLat, maxLon, maxLat };
}
