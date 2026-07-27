import { Inject, Injectable } from '@nestjs/common';
import {
  rankLeaderboard,
  type PublicLeaderboard,
} from '@troll/shared';
import { DERBY_STORE, type DerbyStore } from './types.js';

@Injectable()
export class DerbiesService {
  constructor(@Inject(DERBY_STORE) private readonly store: DerbyStore) {}

  /**
   * Public leaderboard for GET /derbies/:slug — no login, no PII beyond display names.
   */
  async leaderboard(slug: string): Promise<PublicLeaderboard | null> {
    const derby = await this.store.getBySlug(slug);
    if (!derby) return null;

    const [entries, weighIns] = await Promise.all([
      this.store.listEntries(derby.id),
      this.store.listWeighIns(derby.id),
    ]);

    const entryById = new Map(entries.map((e) => [e.id, e]));
    const rows = weighIns.map((w) => {
      const entry = entryById.get(w.entryId);
      return {
        weighInId: w.id,
        displayName: entry?.displayName ?? 'Unknown',
        species: w.species,
        massKg: w.massKg,
        weighedAt: w.t,
        station: w.station,
        witness: w.witness,
        hasPhoto: w.photoKeys.length > 0,
        voidedAt: w.voidedAt,
      };
    });

    const ranked = rankLeaderboard(rows);
    const registeredCount = entries.filter((e) => e.paidAt).length;

    return {
      slug: derby.slug,
      name: derby.name,
      startsAt: derby.startsAt,
      endsAt: derby.endsAt,
      rules: derby.rules,
      entries: ranked,
      registeredCount,
      weighInCount: ranked.length,
    };
  }
}
