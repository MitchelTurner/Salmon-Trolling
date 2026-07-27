/**
 * Fish tags — printable dock codes + guest status (08-charter-derby.md).
 */

import { z } from 'zod';

/** Human-readable dock code: TROLL-XXXXXXXX */
export const FishTagCodeSchema = z
  .string()
  .regex(/^TROLL-[A-Z0-9]{8}$/, 'expected TROLL-XXXXXXXX');

export const IssueFishTagBodySchema = z.object({
  catchId: z.string().min(1),
  guestName: z.string().trim().min(1).max(120).optional(),
  guestEmail: z.string().email().optional(),
});

export type IssueFishTagBody = z.infer<typeof IssueFishTagBodySchema>;

export const FishTagSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  catchId: z.string().min(1),
  code: FishTagCodeSchema,
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  species: z.string().min(1),
  createdAt: z.string().datetime(),
  /** Public status path for guest QR / label. */
  statusPath: z.string().min(1),
});

export type FishTag = z.infer<typeof FishTagSchema>;

export type FishTagStatusStage =
  | 'tagged'
  | 'at_processor'
  | 'shipped'
  | 'delivered';

export const FishTagStatusSchema = z.object({
  code: FishTagCodeSchema,
  guestName: z.string().optional(),
  species: z.string().min(1),
  stage: z.enum(['tagged', 'at_processor', 'shipped', 'delivered']),
  boatName: z.string().optional(),
  processor: z.string().optional(),
  carrier: z.string().optional(),
  tracking: z.string().optional(),
  updatedAt: z.string().datetime(),
});

export type FishTagStatus = z.infer<typeof FishTagStatusSchema>;

export function mintFishTagCode(entropy: string): string {
  const cleaned = entropy.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const pad = cleaned.padEnd(8, 'X').slice(0, 8);
  return `TROLL-${pad}`;
}
