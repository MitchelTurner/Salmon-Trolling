import {
  lightContext,
  solarDay,
  moonPhase,
} from '@troll/engine';
import {
  getRegion,
  type BathyTileRef,
  type RegionId,
} from '@troll/shared';
import type { BundlePayloadBody } from '@troll/shared';

/**
 * Pluggable inputs for bundle assembly.
 * Production wires live integrations; tests inject fixtures.
 */
export interface BundleDataSource {
  load(input: {
    regionId: RegionId;
    startIso: string;
    expiresAt: string;
  }): Promise<BundlePayloadBody>;
}

/**
 * Deterministic fixture source for tests and early dock bundles.
 * Uses engine sun/moon at region marine point; empty live series placeholders.
 */
export class FixtureBundleDataSource implements BundleDataSource {
  constructor(private readonly bathyTileRefs: readonly BathyTileRef[] = []) {}

  async load(input: {
    regionId: RegionId;
    startIso: string;
    expiresAt: string;
  }): Promise<BundlePayloadBody> {
    const region = getRegion(input.regionId);
    const start = new Date(input.startIso);
    const mid = new Date(
      Date.parse(input.startIso) +
        (Date.parse(input.expiresAt) - Date.parse(input.startIso)) / 2,
    );

    const solar = solarDay(region.marinePoint.lat, region.marinePoint.lon, start);
    const moon = moonPhase(mid);
    const light = lightContext(
      region.marinePoint.lat,
      region.marinePoint.lon,
      mid,
    );

    return {
      tides: [
        {
          stationId: region.stations.coopsTide,
          beginDate: input.startIso.slice(0, 10).replace(/-/g, ''),
          endDate: input.expiresAt.slice(0, 10).replace(/-/g, ''),
          predictions: [],
        },
      ],
      currents: [
        {
          stationId: region.stations.coopsCurrent,
          beginDate: input.startIso.slice(0, 10).replace(/-/g, ''),
          endDate: input.expiresAt.slice(0, 10).replace(/-/g, ''),
          predictions: [],
        },
      ],
      forecast: {
        zoneId: region.stations.nwsMarineZone,
        issuingOffice: 'PAJK',
        issueTime: input.startIso,
        periods: [],
      },
      regs: {
        regionId: input.regionId,
        fetchedAt: input.startIso,
        items: [],
      },
      sunMoon: {
        solar,
        moon,
        light: {
          at: light.at,
          lightLevel: light.lightLevel,
          sunAltitudeDeg: light.sunAltitudeDeg,
          isCivilTwilight: light.isCivilTwilight,
          isDaylight: light.isDaylight,
        },
      },
      bathyTileRefs: [...this.bathyTileRefs],
    };
  }
}
