import { describe, expect, it } from 'vitest';
import { FixtureAdfgClient } from '../integrations/adfg/fixture-client.js';
import { parseEonrDetailHtml } from '../integrations/adfg/parse.js';
import type { AdfgClient } from '../integrations/adfg/types.js';
import { AdfgIngestService } from './adfg-ingest.service.js';
import { MemoryRegulationStore } from './regulation-store.js';
import { MemoryReviewQueue } from './review-queue.js';

describe('AdfgIngestService', () => {
  it('ingests new EOs, enqueues review, and surfaces parse failures', async () => {
    const store = new MemoryRegulationStore();
    const reviews = new MemoryReviewQueue();
    const base = new FixtureAdfgClient(
      () => new Date('2026-07-27T12:00:00.000Z'),
    );

    const client: AdfgClient = {
      fetchEmergencyOrderList: (input) => base.fetchEmergencyOrderList(input),
      fetchEmergencyOrderDetail: async (path) => {
        const nrId = path.match(/NRID=(\d+)/i)?.[1];
        if (nrId === '4085') return base.fetchEmergencyOrderDetail(path);
        // Simulate parse failure for other NRIDs without network.
        return parseEonrDetailHtml('<html><body>nope</body></html>', {
          nrId: nrId ?? 'x',
          sourceUrl: path,
        });
      },
    };

    const service = new AdfgIngestService(
      client,
      store,
      reviews,
      () => new Date('2026-07-27T12:00:00.000Z'),
    );

    const result = await service.ingestSoutheast(2026);
    expect(result.upserted.length).toBeGreaterThan(0);
    expect(result.parseFailures.length).toBeGreaterThan(0);
    expect(result.reviewEnqueued).toBeGreaterThan(0);

    const surfaced = await store.listSurfaced('ketchikan');
    expect(surfaced.some((r) => r.parseOk === false)).toBe(true);
    expect(surfaced.some((r) => r.parseOk === true && r.nrId === '4085')).toBe(
      true,
    );

    const pending = await reviews.listPending('ketchikan');
    expect(pending.some((r) => r.reason === 'parse_failed')).toBe(true);
    expect(pending.some((r) => r.reason === 'new')).toBe(true);
  });

  it('does not supersede a good record with a failed re-parse', async () => {
    const store = new MemoryRegulationStore();
    const reviews = new MemoryReviewQueue();
    const fetchedAt = '2026-07-27T12:00:00.000Z';

    await store.put({
      id: 'reg_good',
      regionId: 'ketchikan',
      kind: 'emergencyOrder',
      body: { summary: 'prior good parse' },
      sourceUrl: 'https://example.test/4085',
      fetchedAt,
      parseOk: true,
      contentHash: 'stale-hash',
      nrId: '4085',
    });

    const service = new AdfgIngestService(
      {
        fetchEmergencyOrderList: async () => ({
          sourceUrl: 'https://example.test/list',
          fetchedAt: '2026-07-27T13:00:00.000Z',
          contentHash: 'list-hash',
          cacheTtlMs: 1,
          items: [
            {
              nrId: '4085',
              releaseDate: '07/17/26',
              area: 'Petersburg',
              summary: 'Increased opportunity',
              action: 'Liberalization',
              detailPath:
                '/sf/EONR/index.cfm?ADFG=region.NR&Year=2026&NRID=4085',
            },
          ],
        }),
        fetchEmergencyOrderDetail: async () =>
          parseEonrDetailHtml('<html><body>broken</body></html>', {
            nrId: '4085',
            sourceUrl: 'https://example.test/broken',
          }),
      },
      store,
      reviews,
      () => new Date('2026-07-27T13:00:00.000Z'),
    );

    await service.ingestSoutheast(2026);
    const stillGood = await store.getByNrId('ketchikan', '4085');
    expect(stillGood?.parseOk).toBe(true);
    expect(stillGood?.id).toBe('reg_good');
    expect(stillGood?.supersededAt).toBeUndefined();

    const surfaced = await store.listSurfaced('ketchikan');
    expect(
      surfaced.some((r) => r.parseOk === false && r.nrId === '4085'),
    ).toBe(true);
  });

  it('fails closed when the list scrape is unparseable', async () => {
    const service = new AdfgIngestService(
      {
        fetchEmergencyOrderList: async () => {
          throw new Error('ADF&G EONR: list table not found');
        },
        fetchEmergencyOrderDetail: async () => {
          throw new Error('unreachable');
        },
      },
      new MemoryRegulationStore(),
      new MemoryReviewQueue(),
    );

    await expect(service.ingestSoutheast(2026)).rejects.toThrow(
      /retaining last known/i,
    );
  });
});
