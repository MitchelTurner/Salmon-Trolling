/**
 * Charter ops: bookings, deposits, waivers, crew schedule, cancel/rebook.
 */

import { z } from 'zod';

export const BookingStatusSchema = z.enum([
  'pending_deposit',
  'confirmed',
  'cancelled',
  'rebooked',
]);

export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const CreateBookingBodySchema = z.object({
  guestName: z.string().trim().min(1).max(120),
  guestEmail: z.string().email(),
  boatId: z.string().min(1),
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.number().int().min(1).max(20),
  depositAmountCents: z.number().int().positive(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateBookingBody = z.infer<typeof CreateBookingBodySchema>;

export const SignWaiverBodySchema = z.object({
  bookingId: z.string().min(1),
  signerName: z.string().trim().min(1).max(120),
  /** Base64 or data-URL signature strokes / image. */
  signatureData: z.string().min(1).max(200_000),
});

export type SignWaiverBody = z.infer<typeof SignWaiverBodySchema>;

export const CreateCrewShiftBodySchema = z.object({
  boatId: z.string().min(1),
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  role: z.enum(['CAPTAIN', 'CREW']),
});

export type CreateCrewShiftBody = z.infer<typeof CreateCrewShiftBodySchema>;

export const CancelBookingBodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const RebookBodySchema = z.object({
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  boatId: z.string().min(1).optional(),
});

export type CancelBookingBody = z.infer<typeof CancelBookingBodySchema>;
export type RebookBody = z.infer<typeof RebookBodySchema>;
