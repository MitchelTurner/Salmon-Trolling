import { describe, expect, it } from 'vitest';
import {
  DerbyRulesSchema,
  DerbySlugSchema,
  DerbyTicketCodeSchema,
  RegisterDerbyBodySchema,
  mintDerbyTicketCode,
  PublicLeaderboardSchema,
  rankLeaderboard,
} from './derby.js';

describe('DerbySlugSchema', () => {
  it('accepts kebab-case', () => {
    expect(DerbySlugSchema.safeParse('ketchikan-king-2026').success).toBe(true);
  });

  it('rejects uppercase and spaces', () => {
    expect(DerbySlugSchema.safeParse('Ketchikan').success).toBe(false);
    expect(DerbySlugSchema.safeParse('has spaces').success).toBe(false);
  });
});

describe('DerbyRulesSchema', () => {
  it('defaults allowAppCatchEntries to false', () => {
    const rules = DerbyRulesSchema.parse({
      eligibleSpecies: ['king', 'coho'],
    });
    expect(rules.allowAppCatchEntries).toBe(false);
  });
});

describe('mintDerbyTicketCode', () => {
  it('mints DERBY-XXXXXXXX', () => {
    const code = mintDerbyTicketCode('abc12345');
    expect(DerbyTicketCodeSchema.safeParse(code).success).toBe(true);
    expect(code).toBe('DERBY-ABC12345');
  });
});

describe('RegisterDerbyBodySchema', () => {
  it('requires waiver with Stripe return urls', () => {
    const parsed = RegisterDerbyBodySchema.safeParse({
      displayName: 'Alex',
      email: 'alex@example.com',
      successUrl: 'https://troll.app/ok',
      cancelUrl: 'https://troll.app/cancel',
      waiver: { signerName: 'Alex', signatureData: 'sig' },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('CreateWeighInBodySchema', () => {
  it('requires a ticket and client id for offline idempotency', async () => {
    const { CreateWeighInBodySchema } = await import('./derby.js');
    const parsed = CreateWeighInBodySchema.safeParse({
      clientId: '01HXCLIENT0000000000000001',
      ticketCode: 'DERBY-ABC12345',
      species: 'king',
      massKg: 12,
      station: 'thomas-basin',
      t: '2026-07-02T19:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.photoKeys).toEqual([]);
  });
});

describe('rankLeaderboard', () => {
  it('ranks by mass descending and skips voided', () => {
    const ranked = rankLeaderboard([
      {
        weighInId: 'w1',
        displayName: 'A',
        species: 'king',
        massKg: 10,
        weighedAt: '2026-07-01T12:00:00.000Z',
        station: 'dock-a',
        hasPhoto: true,
      },
      {
        weighInId: 'w2',
        displayName: 'B',
        species: 'king',
        massKg: 20,
        weighedAt: '2026-07-01T13:00:00.000Z',
        station: 'dock-a',
        hasPhoto: false,
        voidedAt: '2026-07-01T14:00:00.000Z',
      },
      {
        weighInId: 'w3',
        displayName: 'C',
        species: 'coho',
        massKg: 15,
        weighedAt: '2026-07-01T11:00:00.000Z',
        station: 'dock-b',
        hasPhoto: true,
      },
    ]);

    expect(ranked.map((r) => r.weighInId)).toEqual(['w3', 'w1']);
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[1]!.rank).toBe(2);
  });

  it('ties share rank with skip', () => {
    const ranked = rankLeaderboard([
      {
        weighInId: 'a',
        displayName: 'A',
        species: 'king',
        massKg: 12,
        weighedAt: '2026-07-01T10:00:00.000Z',
        station: 's',
        hasPhoto: false,
      },
      {
        weighInId: 'b',
        displayName: 'B',
        species: 'king',
        massKg: 12,
        weighedAt: '2026-07-01T11:00:00.000Z',
        station: 's',
        hasPhoto: false,
      },
      {
        weighInId: 'c',
        displayName: 'C',
        species: 'king',
        massKg: 10,
        weighedAt: '2026-07-01T12:00:00.000Z',
        station: 's',
        hasPhoto: false,
      },
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('builds a valid public leaderboard payload', () => {
    const entries = rankLeaderboard([
      {
        weighInId: 'w1',
        displayName: 'Alex',
        species: 'king',
        massKg: 18.2,
        weighedAt: '2026-07-04T18:00:00.000Z',
        station: 'thomas-basin',
        hasPhoto: true,
      },
    ]);
    const board = PublicLeaderboardSchema.parse({
      slug: 'ketchikan-king-2026',
      name: 'Ketchikan King Derby 2026',
      startsAt: '2026-07-01T08:00:00.000Z',
      endsAt: '2026-07-05T02:00:00.000Z',
      rules: { eligibleSpecies: ['king'], allowAppCatchEntries: false },
      entries,
      registeredCount: 40,
      weighInCount: 1,
    });
    expect(board.entries[0]!.displayName).toBe('Alex');
  });
});
