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

/** Human-readable ticket: DERBY-XXXXXXXX */
export const DerbyTicketCodeSchema = z
  .string()
  .regex(/^DERBY-[A-Z0-9]{8}$/, 'expected DERBY-XXXXXXXX');

export function mintDerbyTicketCode(entropy: string): string {
  const cleaned = entropy.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const pad = cleaned.padEnd(8, 'X').slice(0, 8);
  return `DERBY-${pad}`;
}

export const RegisterDerbyBodySchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  /** Waiver captured before redirect to Stripe. */
  waiver: z.object({
    signerName: z.string().trim().min(1).max(120),
    signatureData: z.string().min(1).max(200_000),
  }),
});

export type RegisterDerbyBody = z.infer<typeof RegisterDerbyBodySchema>;

export const CompleteDerbyRegistrationBodySchema = z.object({
  sessionId: z.string().min(1),
});

export type CompleteDerbyRegistrationBody = z.infer<
  typeof CompleteDerbyRegistrationBodySchema
>;

/** Public registration receipt — no Stripe customer ids. */
export const DerbyRegistrationReceiptSchema = z.object({
  entryId: z.string().min(1),
  slug: DerbySlugSchema,
  displayName: z.string().min(1),
  paid: z.boolean(),
  waiverAt: z.string().datetime().optional(),
  ticketCode: DerbyTicketCodeSchema.optional(),
  checkoutUrl: z.string().url().optional(),
  checkoutSessionId: z.string().optional(),
});

export type DerbyRegistrationReceipt = z.infer<
  typeof DerbyRegistrationReceiptSchema
>;

/** Paid ticket row for station prefetch (offline dock). */
export const DerbyTicketRosterItemSchema = z.object({
  entryId: z.string().min(1),
  ticketCode: DerbyTicketCodeSchema,
  displayName: z.string().min(1),
  paidAt: z.string().datetime(),
});

export type DerbyTicketRosterItem = z.infer<typeof DerbyTicketRosterItemSchema>;

/**
 * Station weigh-in. `clientId` is the offline idempotency key (ULID).
 * Records against a registered paid ticket only.
 */
export const CreateWeighInBodySchema = z.object({
  clientId: z.string().min(1),
  ticketCode: DerbyTicketCodeSchema,
  species: z.string().trim().min(1).max(80),
  massKg: z.number().positive().max(200),
  station: z.string().trim().min(1).max(120),
  /** ISO timestamp from the dock device clock. */
  t: z.string().datetime(),
  witness: z.string().trim().min(1).max(120).optional(),
  photoKeys: z.array(z.string().min(1)).max(8).default([]),
});

export type CreateWeighInBody = z.infer<typeof CreateWeighInBodySchema>;

export const WeighInRecordSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  derbyId: z.string().min(1),
  entryId: z.string().min(1),
  ticketCode: DerbyTicketCodeSchema,
  displayName: z.string().min(1),
  species: z.string().min(1),
  massKg: z.number().positive(),
  t: z.string().datetime(),
  station: z.string().min(1),
  operatorId: z.string().min(1),
  witness: z.string().optional(),
  photoKeys: z.array(z.string()),
  voidedAt: z.string().datetime().nullable().optional(),
});

export type WeighInRecord = z.infer<typeof WeighInRecordSchema>;

/** Append-only derby audit events — the product when prizes are disputed. */
export const DerbyAuditActionSchema = z.enum([
  'REGISTRATION_STARTED',
  'TICKET_ISSUED',
  'WEIGH_IN_RECORDED',
  'WEIGH_IN_VOIDED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
]);

export type DerbyAuditAction = z.infer<typeof DerbyAuditActionSchema>;

export const DerbyAuditEventSchema = z.object({
  id: z.string().min(1),
  derbyId: z.string().min(1),
  action: DerbyAuditActionSchema,
  actorId: z.string().min(1),
  at: z.string().datetime(),
  weighInId: z.string().min(1).optional(),
  entryId: z.string().min(1).optional(),
  disputeId: z.string().min(1).optional(),
  /** Human-readable detail safe to show operators. */
  detail: z.string().min(1).max(500),
  /** Structured context (mass, station, resolution, …) — no emails. */
  meta: z.record(z.unknown()).default({}),
});

export type DerbyAuditEvent = z.infer<typeof DerbyAuditEventSchema>;

export const VoidWeighInBodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type VoidWeighInBody = z.infer<typeof VoidWeighInBodySchema>;

export const DisputeStatusSchema = z.enum(['open', 'resolved']);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export const DisputeResolutionSchema = z.enum([
  /** Keep the weigh-in on the board. */
  'uphold',
  /** Void the weigh-in (remove from leaderboard). */
  'overturn',
  /** Close without changing the weigh-in. */
  'dismiss',
]);

export type DisputeResolution = z.infer<typeof DisputeResolutionSchema>;

export const OpenDisputeBodySchema = z.object({
  weighInId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

export type OpenDisputeBody = z.infer<typeof OpenDisputeBodySchema>;

export const ResolveDisputeBodySchema = z.object({
  resolution: DisputeResolutionSchema,
  notes: z.string().trim().min(1).max(500),
});

export type ResolveDisputeBody = z.infer<typeof ResolveDisputeBodySchema>;

export const DerbyDisputeSchema = z.object({
  id: z.string().min(1),
  derbyId: z.string().min(1),
  weighInId: z.string().min(1),
  status: DisputeStatusSchema,
  reason: z.string().min(1),
  openedBy: z.string().min(1),
  openedAt: z.string().datetime(),
  resolution: DisputeResolutionSchema.optional(),
  resolvedBy: z.string().min(1).optional(),
  resolvedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type DerbyDispute = z.infer<typeof DerbyDisputeSchema>;

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
