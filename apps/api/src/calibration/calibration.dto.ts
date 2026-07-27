import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SampleSchema = z.object({
  measuredDepthM: z.number(),
  cableOutM: z.number().positive(),
  stwMs: z.number().nonnegative(),
  ballMassKg: z.number().positive(),
  ballShape: z.enum(['sphere', 'pancake', 'torpedo']),
  cableDiameterM: z.number().positive(),
  cableLinearMassKgPerM: z.number().positive(),
  terminalDragN: z.number().nonnegative(),
});

export const RunCalibrationBodySchema = z.object({
  scope: z.enum(['GLOBAL', 'BOAT', 'RIG']),
  boatId: z.string().min(1).optional(),
  rigId: z.string().min(1).optional(),
  samples: z.array(SampleSchema).min(1),
});

export class RunCalibrationBodyDto extends createZodDto(
  RunCalibrationBodySchema,
) {}
