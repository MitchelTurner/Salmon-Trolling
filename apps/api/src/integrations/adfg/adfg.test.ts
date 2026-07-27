import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FixtureAdfgClient } from './fixture-client.js';
import { parseEonrDetailHtml, parseEonrListHtml } from './parse.js';
import { ADFG_TTL } from './ttl.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('ADF&G TTLs', () => {
  it('matches docs/04-data-sources.md (6 h)', () => {
    expect(ADFG_TTL.regulationsMs).toBe(6 * 60 * 60 * 1000);
  });
});

describe('ADF&G list/detail parse', () => {
  it('parses the Southeast EONR list fixture', () => {
    const html = readFileSync(
      join(fixturesDir, 'eonr-r1-2026-list.html'),
      'utf8',
    );
    const snapshot = parseEonrListHtml(html, {
      sourceUrl: 'https://example.test/eonr',
      fetchedAt: '2026-07-27T12:00:00.000Z',
    });

    expect(snapshot.items.length).toBeGreaterThan(3);
    expect(snapshot.contentHash).toHaveLength(64);
    expect(snapshot.cacheTtlMs).toBe(ADFG_TTL.regulationsMs);
    expect(snapshot.items.some((i) => i.nrId === '4085')).toBe(true);
  });

  it('parses a detail page with EO number and dates', () => {
    const html = readFileSync(join(fixturesDir, 'eonr-nr-4085.html'), 'utf8');
    const detail = parseEonrDetailHtml(html, {
      nrId: '4085',
      sourceUrl: 'https://example.test/4085',
    });

    expect(detail.parseOk).toBe(true);
    expect(detail.eoNumber).toBe('01-KS-C-23-26');
    expect(detail.releasedAt).toBe('2026-07-17T00:00:00.000Z');
    expect(detail.expiresAt).toBe('2026-08-15T00:00:00.000Z');
    expect(detail.bodyText.toLowerCase()).toContain('king salmon');
  });

  it('fail-closes on unparseable detail — parseOk false, no invented EO', () => {
    const html = readFileSync(join(fixturesDir, 'eonr-nr-broken.html'), 'utf8');
    const detail = parseEonrDetailHtml(html, {
      nrId: '9999',
      sourceUrl: 'https://example.test/broken',
    });

    expect(detail.parseOk).toBe(false);
    expect(detail.eoNumber).toBeUndefined();
    expect(detail.parseErrors.length).toBeGreaterThan(0);
  });

  it('throws when the list table is missing (fail-closed)', () => {
    expect(() =>
      parseEonrListHtml('<html><body>no table</body></html>', {
        sourceUrl: 'x',
        fetchedAt: '2026-07-27T12:00:00.000Z',
      }),
    ).toThrow(/list table not found/i);
  });
});

describe('FixtureAdfgClient', () => {
  it('loads recorded list + detail fixtures', async () => {
    const client = new FixtureAdfgClient(
      () => new Date('2026-07-27T12:00:00.000Z'),
    );
    const list = await client.fetchEmergencyOrderList({
      regionCode: 'R1',
      year: 2026,
    });
    const detail = await client.fetchEmergencyOrderDetail(
      list.items.find((i) => i.nrId === '4085')!.detailPath,
    );
    expect(detail.parseOk).toBe(true);
    expect(detail.nrId).toBe('4085');
  });
});
