/**
 * Fishing regions for offline bundles and station lookups.
 * Start with exactly one — do not generalize before a second real region
 * (docs/04-data-sources.md).
 */

export const REGION_IDS = ['ketchikan'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type RegionStations = {
  /** NOAA CO-OPS water-level / tide station. */
  readonly coopsTide: string;
  /** NOAA CO-OPS current-prediction station in the Narrows. */
  readonly coopsCurrent: string;
};

export type Region = {
  readonly id: RegionId;
  readonly name: string;
  readonly bbox: {
    readonly minLon: number;
    readonly minLat: number;
    readonly maxLon: number;
    readonly maxLat: number;
  };
  readonly stations: RegionStations;
};

export const REGIONS: Readonly<Record<RegionId, Region>> = {
  ketchikan: {
    id: 'ketchikan',
    name: 'Ketchikan and surrounding waters',
    bbox: {
      minLon: -132.2,
      minLat: 54.9,
      maxLon: -130.8,
      maxLat: 55.8,
    },
    stations: {
      coopsTide: '9450460',
      coopsCurrent: 'PCT2786',
    },
  },
};

export const DEFAULT_REGION_ID: RegionId = 'ketchikan';

export function getRegion(id: RegionId = DEFAULT_REGION_ID): Region {
  return REGIONS[id];
}
