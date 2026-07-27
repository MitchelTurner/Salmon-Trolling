import { NOT_FOR_NAVIGATION_LABEL } from '@troll/shared';
import { describe, expect, it } from 'vitest';
import { BATHY_TTL } from '../integrations/bathy/ttl.js';
import { FixtureBathySource } from '../integrations/bathy/fixture-source.js';
import { parseContourCollection } from '../integrations/bathy/parse.js';
import { BathyTileGenerator } from './generate.js';
import { MemoryObjectStore } from './object-store.js';
import { renderBathyTile } from './render.js';

describe('BATHY_TTL', () => {
  it('is permanent (docs/04-data-sources.md)', () => {
    expect(BATHY_TTL.permanent).toBe(true);
  });
});

describe('renderBathyTile', () => {
  it('bakes not-for-navigation into tile and every feature', () => {
    const tile = renderBathyTile({
      regionId: 'ketchikan',
      z: 10,
      x: 1,
      y: 2,
      features: [
        {
          depthM: 20,
          coordinates: [
            [-131.7, 55.3],
            [-131.6, 55.31],
          ],
        },
      ],
    });

    expect(tile.properties.disclaimer).toBe(NOT_FOR_NAVIGATION_LABEL);
    expect(tile.properties.notForNavigation).toBe(true);
    expect(tile.features[0]?.properties.disclaimer).toBe(
      NOT_FOR_NAVIGATION_LABEL,
    );
    expect(tile.features[0]?.properties.notForNavigation).toBe(true);
  });
});

describe('BathyTileGenerator', () => {
  it('writes tiles once to object storage with disclaimer baked in', async () => {
    const store = new MemoryObjectStore();
    const generator = new BathyTileGenerator(
      new FixtureBathySource(),
      store,
      () => new Date('2026-07-27T12:00:00.000Z'),
    );

    const first = await generator.generate({
      regionId: 'ketchikan',
      minZoom: 10,
      maxZoom: 10,
    });

    expect(first.written).toBeGreaterThan(0);
    expect(first.skippedExisting).toBe(0);
    expect(first.tileRefs.length).toBe(first.written);
    expect(await store.has('bathy/ketchikan/manifest.json')).toBe(true);

    const sample = first.tileRefs[0]!;
    const tile = await generator.readTile(
      sample.regionId,
      sample.z,
      sample.x,
      sample.y,
    );
    expect(tile?.properties.disclaimer).toBe(NOT_FOR_NAVIGATION_LABEL);
    expect(
      tile?.features.every((f) => f.properties.disclaimer === NOT_FOR_NAVIGATION_LABEL),
    ).toBe(true);

    const second = await generator.generate({
      regionId: 'ketchikan',
      minZoom: 10,
      maxZoom: 10,
    });
    expect(second.written).toBe(0);
    expect(second.skippedExisting).toBe(first.written);
  });

  it('re-stamps the label on read even if storage was stripped', async () => {
    const store = new MemoryObjectStore();
    const key = 'bathy/ketchikan/10/0/0.geojson';
    await store.put(
      key,
      new TextEncoder().encode(
        JSON.stringify({
          type: 'FeatureCollection',
          properties: {},
          features: [
            {
              type: 'Feature',
              properties: { depthM: 10 },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-131.7, 55.3],
                  [-131.6, 55.3],
                ],
              },
            },
          ],
        }),
      ),
    );

    const generator = new BathyTileGenerator(new FixtureBathySource(), store);
    const tile = await generator.readTile('ketchikan', 10, 0, 0);
    expect(tile?.properties.disclaimer).toBe(NOT_FOR_NAVIGATION_LABEL);
    expect(tile?.features[0]?.properties.notForNavigation).toBe(true);
  });
});

describe('parseContourCollection', () => {
  it('rejects empty collections fail-closed', () => {
    expect(() =>
      parseContourCollection({ type: 'FeatureCollection', features: [] }),
    ).toThrow(/no contour/i);
  });
});
