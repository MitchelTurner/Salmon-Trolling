import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseContourCollection } from './parse.js';
import type { BathySource, ContourCollection } from './types.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** Recorded-fixture bathymetry source — never hits the network. */
export class FixtureBathySource implements BathySource {
  async getDepthContours(regionId: string): Promise<ContourCollection> {
    const path = join(FIXTURES_DIR, `${regionId}-contours.geojson`);
    const body = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return parseContourCollection(body);
  }
}
