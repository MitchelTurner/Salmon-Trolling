/**
 * Derby — public leaderboard, registration, weigh-ins (08-charter-derby.md).
 */

import { z } from 'zod';

/** URL slug: lowercase letters, digits, hyphens. */
export const DerbySlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'expected kebab-case slug');

/**
 * Per-derby rules. App catch logs normally must not count as entries —
 * official weigh-in only.
 */
export const DerbyRulesSchema = z.object({
  eligibleSpecies: z.array(z.string().min(1)).min(1),
  /** Minimum length in meters when enforced; omit when not used. */
  minLengthM: z.number().positive().optional(),
  /** Minimum mass in kilograms when enforced. */
  minMassKg: z.number().positive().optional(),
  /** When true, in-app catch logs may count. Default false (weigh-in only). */
  allowAppCatchEntries: z.boolean().default(false),
});

export type DerbyRules = z.infer<typeof DerbyRulesSchema>;

export const DerbySchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  slug: DerbySlugSchema,
  name: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  rules: DerbyRulesSchema,
});

export type Derby = z.infer<typeof DerbySchema>;

/** Public leaderboard row — no email or Stripe ids. */
export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  weighInId: z.string().min(1),
  displayName: z.string().min(1),
  species: z.string().min(1),
  massKg: z.number().positive(),
  weighedAt: z.string().datetime(),
  station: z.string().min(1),
  witness: z.string().optional(),
  hasPhoto: z.boolean(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const PublicLeaderboardSchema = z.object({
  slug: DerbySlugSchema,
  name: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  rules: DerbyRulesSchema,
  entries: z.array(LeaderboardEntrySchema),
  /** Count of registered tickets (paid); not the same as weigh-in rows. */
  registeredCount: z.number().int().nonnegative(),
  /** Non-voided weigh-ins on the board. */
  weighInCount: z.number().int().nonnegative(),
});

export type PublicLeaderboard = z.infer<typeof PublicLeaderboardSchema>;

/**
 * Rank non-voided weigh-ins by mass descending.
 * Ties share the same rank; next rank skips (1, 2, 2, 4).
 */
export function rankLeaderboard(
  rows: ReadonlyArray<{
    weighInId: string;
    displayName: string;
    species: string;
    massKg: number;
    weighedAt: string;
    station: string;
    witness?: string;
    hasPhoto: boolean;
    voidedAt?: string | null;
  }>,
): LeaderboardEntry[] {
  const active = rows.filter((r) => !r.voidedAt);
  const sorted = [...active].sort((a, b) => {
    if (b.massKg !== a.massKg) return b.massKg - a.massKg;
    return a.weighedAt.localeCompare(b.weighedAt);
  });

  const out: LeaderboardEntry[] = [];
  let lastMass: number | null = null;
  let lastRank = 0;
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]!;
    const rank = lastMass !== null && row.massKg === lastMass ? lastRank : i + 1;
    lastMass = row.massKg;
    lastRank = rank;
    out.push({
      rank,
      weighInId: row.weighInId,
      displayName: row.displayName,
      species: row.species,
      massKg: row.massKg,
      weighedAt: row.weighedAt,
      station: row.station,
      witness: row.witness,
      hasPhoto: row.hasPhoto,
    });
  }
  return out;
}
