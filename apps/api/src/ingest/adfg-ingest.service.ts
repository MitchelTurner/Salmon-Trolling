import { contentHash } from '../integrations/adfg/hash.js';
import type { AdfgClient, AdfgListItem } from '../integrations/adfg/types.js';
import type { ReviewQueue } from './review-queue.js';
import type { RegulationStore, StoredRegulation } from './regulation-store.js';

export type AdfgIngestResult = {
  readonly fetchedAt: string;
  readonly listHash: string;
  readonly changed: boolean;
  readonly upserted: readonly StoredRegulation[];
  /** parseOk=false rows created this run — surfaced, never hidden. */
  readonly parseFailures: readonly StoredRegulation[];
  readonly reviewEnqueued: number;
};

function ulidLike(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(4, '0')}`;
}

/**
 * ADF&G emergency-order ingest.
 * Change detection → detail scrape → regulation upsert + human review queue.
 * Fail-closed: parse errors become parseOk=false records and never replace a
 * prior good parse with a guess.
 */
export class AdfgIngestService {
  private seq = 0;

  constructor(
    private readonly client: AdfgClient,
    private readonly store: RegulationStore,
    private readonly reviews: ReviewQueue,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async ingestSoutheast(year: number, regionId = 'ketchikan'): Promise<AdfgIngestResult> {
    let snapshot;
    try {
      snapshot = await this.client.fetchEmergencyOrderList({
        regionCode: 'R1',
        year,
      });
    } catch (err) {
      // Fail-closed: keep last known surfaced records; do not invent replacements.
      throw new Error(
        `ADF&G list ingest failed; retaining last known regulations. ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    const previous = await this.store.listSurfaced(regionId);
    const previousListHash = previous[0]?.body?.listHash;
    const changed =
      previous.length === 0 || previousListHash !== snapshot.contentHash;

    const upserted: StoredRegulation[] = [];
    const parseFailures: StoredRegulation[] = [];
    let reviewEnqueued = 0;

    for (const item of snapshot.items) {
      const existing = await this.store.getByNrId(regionId, item.nrId);
      const itemHash = contentHash(
        `${item.nrId}|${item.releaseDate}|${item.summary}|${item.action}|${item.area}`,
      );

      if (existing && existing.contentHash === itemHash && existing.parseOk) {
        continue;
      }

      const detail = await this.safeDetail(item);
      const fetchedAt = this.now().toISOString();
      const regulationId = ulidLike('reg', ++this.seq);

      const record: StoredRegulation = {
        id: regulationId,
        regionId,
        kind: 'emergencyOrder',
        species: guessSpecies(item.summary, detail.bodyText),
        body: {
          nrId: item.nrId,
          summary: item.summary,
          area: item.area,
          action: item.action,
          eoNumber: detail.eoNumber,
          title: detail.title,
          text: detail.bodyText,
          listHash: snapshot.contentHash,
          parseErrors: detail.parseErrors,
        },
        sourceUrl: detail.sourceUrl,
        fetchedAt,
        effectiveAt: detail.releasedAt,
        parseOk: detail.parseOk,
        contentHash: itemHash,
        nrId: item.nrId,
      };

      // Fail-closed: never supersede a good record with a failed parse.
      if (existing?.parseOk && !detail.parseOk) {
        await this.store.put(record);
        parseFailures.push(record);
        await this.reviews.enqueue({
          regulationId: record.id,
          regionId,
          nrId: item.nrId,
          reason: 'parse_failed',
          sourceUrl: record.sourceUrl,
          contentHash: itemHash,
          createdAt: fetchedAt,
        });
        reviewEnqueued += 1;
        continue;
      }

      if (existing) {
        await this.store.supersede(existing.id, fetchedAt);
      }
      await this.store.put(record);
      upserted.push(record);
      if (!detail.parseOk) parseFailures.push(record);

      const reason = !detail.parseOk
        ? 'parse_failed'
        : existing
          ? 'changed'
          : 'new';
      await this.reviews.enqueue({
        regulationId: record.id,
        regionId,
        nrId: item.nrId,
        reason,
        sourceUrl: record.sourceUrl,
        contentHash: itemHash,
        createdAt: fetchedAt,
      });
      reviewEnqueued += 1;
    }

    return {
      fetchedAt: snapshot.fetchedAt,
      listHash: snapshot.contentHash,
      changed,
      upserted,
      parseFailures,
      reviewEnqueued,
    };
  }

  private async safeDetail(item: AdfgListItem) {
    try {
      return await this.client.fetchEmergencyOrderDetail(item.detailPath);
    } catch (err) {
      return {
        nrId: item.nrId,
        sourceUrl: item.detailPath,
        bodyText: '',
        parseOk: false as const,
        parseErrors: [
          err instanceof Error ? err.message : 'detail fetch failed',
        ],
      };
    }
  }
}

function guessSpecies(
  summary: string,
  body: string,
): string | undefined {
  const text = `${summary} ${body}`.toLowerCase();
  if (text.includes('king salmon') || text.includes('chinook')) return 'chinook';
  if (text.includes('coho')) return 'coho';
  if (text.includes('lingcod')) return 'lingcod';
  return undefined;
}
