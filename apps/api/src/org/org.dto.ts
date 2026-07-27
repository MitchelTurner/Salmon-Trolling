import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateBoatBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  hasPaddleWheel: z.boolean().optional(),
  hasN2K: z.boolean().optional(),
  hasProbe: z.boolean().optional(),
});

export class CreateBoatBodyDto extends createZodDto(CreateBoatBodySchema) {}

export const InviteCrewBodySchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(['CAPTAIN', 'CREW', 'VIEWER']).default('CREW'),
  boatId: z.string().min(1).optional(),
});

export class InviteCrewBodyDto extends createZodDto(InviteCrewBodySchema) {}
