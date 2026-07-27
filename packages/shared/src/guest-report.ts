/**
 * Guest catch report — the charter demo feature (08-charter-derby.md).
 * Generated at trip close; shareable page + email.
 */

import { z } from 'zod';

export const GuestReportCatchSchema = z.object({
  id: z.string().min(1),
  species: z.string().min(1),
  lengthM: z.number().optional(),
  massKg: z.number().optional(),
  kept: z.boolean(),
  t: z.string().datetime(),
  photoKeys: z.array(z.string()).default([]),
});

export const GuestCatchReportSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  tripId: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  boatName: z.string().min(1),
  captainName: z.string().min(1),
  startedAt: z.string().datetime(),
  closedAt: z.string().datetime(),
  conditionsSummary: z.string().optional(),
  catches: z.array(GuestReportCatchSchema),
  sharePath: z.string().min(1),
  createdAt: z.string().datetime(),
  emailedAt: z.string().datetime().optional(),
});

export type GuestReportCatch = z.infer<typeof GuestReportCatchSchema>;
export type GuestCatchReport = z.infer<typeof GuestCatchReportSchema>;

export const GenerateGuestReportBodySchema = z.object({
  guestName: z.string().trim().min(1).max(120),
  guestEmail: z.string().email(),
  boatName: z.string().trim().min(1).max(120),
  captainName: z.string().trim().min(1).max(120),
  conditionsSummary: z.string().trim().max(2000).optional(),
});

export type GenerateGuestReportBody = z.infer<
  typeof GenerateGuestReportBodySchema
>;
