import {
  getRegion,
  NOT_FOR_NAVIGATION_LABEL,
  type BathyTileRef,
  type RegionId,
} from '@troll/shared';
import type { BathySource } from '../integrations/bathy/types.js';
import {
  bboxesIntersect,
  lineBBox,
  tileBBox,
  tilesCoveringBBox,
} from './mercator.js';
import type { ObjectStore } from './object-store.js';
import {
  assertNotForNavigation,
  renderBathyTile,
  tileObjectKey,
  tileRef,
  type BathyTilePayload,
} from './render.js';

export type GenerateBathyOptions = {
  regionId?: RegionId;
  /** Inclusive zoom range. Keep small — contours are structure, not charts. */
  minZoom?: number;
  maxZoom?: number;
  /**
   * When true (default), skip puts for keys that already exist.
   * Bathymetry is one-time generation to object storage.
   */
  oneTime?: boolean;
};

export type GenerateBathyResult = {
  readonly regionId: RegionId;
  readonly tileRefs: readonly BathyTileRef[];
  readonly written: number;
  readonly skippedExisting: number;
  readonly generatedAt: string;
};

const textEncoder = new TextEncoder();

/**
 * One-time bathymetry vector-tile generation into object storage.
 * Every tile is rendered with "not for navigation" baked in.
 */
export class BathyTileGenerator {
  constructor(
    private readonly source: BathySource,
    private readonly store: ObjectStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async generate(options: GenerateBathyOptions = {}): Promise<GenerateBathyResult> {
    const regionId = options.regionId ?? 'ketchikan';
    const minZoom = options.minZoom ?? 9;
    const maxZoom = options.maxZoom ?? 11;
    const oneTime = options.oneTime ?? true;

    const region = getRegion(regionId);
    const contours = await this.source.getDepthContours(regionId);

    const tileRefs: BathyTileRef[] = [];
    let written = 0;
    let skippedExisting = 0;

    for (let z = minZoom; z <= maxZoom; z += 1) {
      const coords = tilesCoveringBBox(region.bbox, z);
      for (const { x, y } of coords) {
        const key = tileObjectKey(regionId, z, x, y);
        const ref = tileRef(regionId, z, x, y);

        if (oneTime && (await this.store.has(key))) {
          tileRefs.push(ref);
          skippedExisting += 1;
          continue;
        }

        const box = tileBBox(z, x, y);
        const features = contours.features
          .filter((f) =>
            bboxesIntersect(box, lineBBox(f.geometry.coordinates)),
          )
          .map((f) => ({
            depthM: f.properties.depthM,
            coordinates: f.geometry.coordinates,
          }));

        const payload = renderBathyTile({
          regionId,
          z,
          x,
          y,
          features,
        });
        assertNotForNavigation(payload);

        await this.store.put(
          key,
          textEncoder.encode(JSON.stringify(payload)),
          'application/geo+json',
        );
        tileRefs.push(ref);
        written += 1;
      }
    }

    // Manifest for bundle bathyTileRefs[] — also permanent / one-time.
    const manifestKey = `bathy/${regionId}/manifest.json`;
    if (!(oneTime && (await this.store.has(manifestKey)))) {
      const manifest = {
        regionId,
        generatedAt: this.now().toISOString(),
        notForNavigation: true as const,
        disclaimer: NOT_FOR_NAVIGATION_LABEL,
        tileRefs,
      };
      await this.store.put(
        manifestKey,
        textEncoder.encode(JSON.stringify(manifest)),
        'application/json',
      );
    }

    return {
      regionId,
      tileRefs,
      written,
      skippedExisting,
      generatedAt: this.now().toISOString(),
    };
  }

  async readTile(
    regionId: string,
    z: number,
    x: number,
    y: number,
  ): Promise<BathyTilePayload | undefined> {
    const body = await this.store.get(tileObjectKey(regionId, z, x, y));
    if (!body) return undefined;
    const parsed = JSON.parse(new TextDecoder().decode(body)) as {
      features?: Array<{
        properties?: { depthM?: number };
        geometry?: { coordinates?: ReadonlyArray<readonly [number, number]> };
      }>;
    };
    // Re-render on read so the label cannot be stripped from stored bytes.
    const features = (parsed.features ?? []).map((f) => ({
      depthM: Number(f.properties?.depthM),
      coordinates: f.geometry?.coordinates ?? [],
    }));
    const tile = renderBathyTile({ regionId, z, x, y, features });
    assertNotForNavigation(tile);
    return tile;
  }
}
