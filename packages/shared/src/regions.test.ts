import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REGION_ID,
  getRegion,
  REGION_IDS,
  REGIONS,
} from './regions.js';

describe('regions', () => {
  it('starts with exactly one region: Ketchikan', () => {
    expect(REGION_IDS).toEqual(['ketchikan']);
    expect(DEFAULT_REGION_ID).toBe('ketchikan');
    expect(Object.keys(REGIONS)).toEqual(['ketchikan']);
  });

  it('wires CO-OPS, NWS, and NDBC stations', () => {
    const region = getRegion();
    expect(region.stations.coopsTide).toBe('9450460');
    expect(region.stations.coopsCurrent).toBe('PCT2786');
    expect(region.stations.nwsMarineZone).toBe('PKZ036');
    expect(region.stations.nwsCwfLocation).toBe('AJK');
    expect(region.stations.ndbcBuoy).toBe('46145');
    expect(region.marinePoint.lat).toBeCloseTo(55.34);
    expect(region.marinePoint.lon).toBeCloseTo(-131.65);
  });
});
