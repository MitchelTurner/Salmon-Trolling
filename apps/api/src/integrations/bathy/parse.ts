import type { ContourCollection, ContourFeature, LonLat } from './types.js';

function isLonLat(value: unknown): value is LonLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

/**
 * Parse a GeoJSON contour FeatureCollection.
 * Rejects empty or malformed sources fail-closed.
 */
export function parseContourCollection(body: unknown): ContourCollection {
  const raw = body as {
    type?: string;
    name?: string;
    features?: unknown[];
  };
  if (raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
    throw new Error('bathy: expected FeatureCollection');
  }

  const features: ContourFeature[] = [];
  for (const f of raw.features) {
    const feature = f as {
      type?: string;
      properties?: { depthM?: unknown; kind?: unknown };
      geometry?: { type?: string; coordinates?: unknown };
    };
    if (feature.type !== 'Feature') continue;
    if (feature.geometry?.type !== 'LineString') continue;
    if (!Array.isArray(feature.geometry.coordinates)) continue;
    const depthM = Number(feature.properties?.depthM);
    if (!Number.isFinite(depthM)) {
      throw new Error('bathy: contour missing depthM');
    }
    const coordinates = feature.geometry.coordinates.filter(isLonLat);
    if (coordinates.length < 2) {
      throw new Error('bathy: contour LineString too short');
    }
    features.push({
      type: 'Feature',
      properties: { depthM, kind: 'contour' },
      geometry: { type: 'LineString', coordinates },
    });
  }

  if (features.length === 0) {
    throw new Error('bathy: no contour features');
  }

  return {
    type: 'FeatureCollection',
    name: raw.name,
    features,
  };
}
