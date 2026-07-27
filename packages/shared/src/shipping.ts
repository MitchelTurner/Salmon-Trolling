/**
 * Shipping records — carrier, tracking, guest notification (08-charter-derby.md).
 */

import { z } from 'zod';
import { FishTagCodeSchema } from './fish-tag.js';

export const CreateShippingBodySchema = z.object({
  tagCode: FishTagCodeSchema,
  carrier: z.string().trim().min(1).max(80),
  tracking: z.string().trim().min(1).max(120),
  destination: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      line1: z.string().trim().min(1).max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(1).max(100),
      region: z.string().trim().min(1).max(100),
      postalCode: z.string().trim().min(1).max(20),
      country: z.string().trim().min(2).max(2).default('US'),
    })
    .optional(),
  /** Override; defaults to tag guest email when present. */
  notifyEmail: z.string().email().optional(),
});

export type CreateShippingBody = z.infer<typeof CreateShippingBodySchema>;

export const ShippingRecordSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  tagCode: FishTagCodeSchema,
  carrier: z.string().min(1),
  tracking: z.string().min(1),
  destination: z.record(z.unknown()).optional(),
  shippedAt: z.string().datetime(),
  notifiedAt: z.string().datetime().optional(),
  notifyEmail: z.string().email().optional(),
});

export type ShippingRecord = z.infer<typeof ShippingRecordSchema>;
