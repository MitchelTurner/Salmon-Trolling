import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEonrDetailHtml, parseEonrListHtml } from './parse.js';
import type {
  AdfgClient,
  AdfgDetail,
  AdfgListSnapshot,
} from './types.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function load(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

/** Recorded-fixture ADF&G client — never hits the network. */
export class FixtureAdfgClient implements AdfgClient {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async fetchEmergencyOrderList(input: {
    regionCode: string;
    year: number;
  }): Promise<AdfgListSnapshot> {
    const html = load(
      `eonr-${input.regionCode.toLowerCase()}-${input.year}-list.html`,
    );
    return parseEonrListHtml(html, {
      sourceUrl: `https://www.adfg.alaska.gov/sf/EONR/index.cfm?ADFG=Region.${input.regionCode}&Year=${input.year}`,
      fetchedAt: this.now().toISOString(),
    });
  }

  async fetchEmergencyOrderDetail(detailPath: string): Promise<AdfgDetail> {
    const nrId = detailPath.match(/NRID=(\d+)/i)?.[1] ?? 'unknown';
    const html = load(`eonr-nr-${nrId}.html`);
    const sourceUrl = detailPath.startsWith('http')
      ? detailPath
      : `https://www.adfg.alaska.gov${detailPath}`;
    return parseEonrDetailHtml(html, { nrId, sourceUrl });
  }
}
