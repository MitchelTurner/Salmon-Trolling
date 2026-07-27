import {
  NOT_FOR_NAVIGATION_LABEL,
  type BathyTileRef,
} from '@troll/shared';

export type BathyTileFeature = {
  type: 'Feature';
  properties: {
    depthM: number;
    kind: 'contour';
    notForNavigation: true;
    disclaimer: typeof NOT_FOR_NAVIGATION_LABEL;
  };
  geometry: {
    type: 'LineString';
    coordinates: ReadonlyArray<readonly [number, number]>;
  };
};

/**
 * Vector tile payload. The disclaimer is structural — every render stamps it.
 */
export type BathyTilePayload = {
  type: 'FeatureCollection';
  properties: {
    notForNavigation: true;
    disclaimer: typeof NOT_FOR_NAVIGATION_LABEL;
    regionId: string;
    z: number;
    x: number;
    y: number;
  };
  features: BathyTileFeature[];
};

export function tileObjectKey(
  regionId: string,
  z: number,
  x: number,
  y: number,
): string {
  return `bathy/${regionId}/${z}/${x}/${y}.geojson`;
}

export function tileRef(
  regionId: string,
  z: number,
  x: number,
  y: number,
): BathyTileRef {
  return {
    key: tileObjectKey(regionId, z, x, y),
    regionId,
    z,
    x,
    y,
  };
}

/**
 * Bake "not for navigation" into the tile on every render.
 * Call this on generate and on read — never serve unlabeled bathymetry.
 */
export function renderBathyTile(input: {
  regionId: string;
  z: number;
  x: number;
  y: number;
  features: ReadonlyArray<{
    depthM: number;
    coordinates: ReadonlyArray<readonly [number, number]>;
  }>;
}): BathyTilePayload {
  return {
    type: 'FeatureCollection',
    properties: {
      notForNavigation: true,
      disclaimer: NOT_FOR_NAVIGATION_LABEL,
      regionId: input.regionId,
      z: input.z,
      x: input.x,
      y: input.y,
    },
    features: input.features.map((f) => ({
      type: 'Feature' as const,
      properties: {
        depthM: f.depthM,
        kind: 'contour' as const,
        notForNavigation: true as const,
        disclaimer: NOT_FOR_NAVIGATION_LABEL,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: f.coordinates,
      },
    })),
  };
}

export function assertNotForNavigation(tile: BathyTilePayload): void {
  if (
    tile.properties.disclaimer !== NOT_FOR_NAVIGATION_LABEL ||
    tile.properties.notForNavigation !== true
  ) {
    throw new Error('bathy tile missing not-for-navigation label');
  }
  for (const f of tile.features) {
    if (
      f.properties.disclaimer !== NOT_FOR_NAVIGATION_LABEL ||
      f.properties.notForNavigation !== true
    ) {
      throw new Error('bathy feature missing not-for-navigation label');
    }
  }
}
