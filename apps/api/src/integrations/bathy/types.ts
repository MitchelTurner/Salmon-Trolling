export type LonLat = readonly [number, number];

export type ContourFeature = {
  readonly type: 'Feature';
  readonly properties: {
    readonly depthM: number;
    readonly kind: 'contour';
  };
  readonly geometry: {
    readonly type: 'LineString';
    readonly coordinates: readonly LonLat[];
  };
};

export type ContourCollection = {
  readonly type: 'FeatureCollection';
  readonly name?: string;
  readonly features: readonly ContourFeature[];
};

/**
 * NOAA ENC / bathymetry source boundary.
 * Contours are static — fetched once for tile generation, never polled.
 */
export interface BathySource {
  getDepthContours(regionId: string): Promise<ContourCollection>;
}

export const BATHY_SOURCE = Symbol('BATHY_SOURCE');
