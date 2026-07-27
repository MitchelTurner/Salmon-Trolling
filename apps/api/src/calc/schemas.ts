import { z } from 'zod';

const nonNeg = z.number().finite().nonnegative();
const positive = z.number().finite().positive();

export const Velocity2Schema = z.object({
  eastMs: z.number().finite(),
  northMs: z.number().finite(),
});

export const PredictedCurrentSchema = Velocity2Schema.extend({
  stationId: z.string().min(1),
  stationDistanceM: nonNeg,
  predictionTimeOffsetS: z.number().finite(),
});

/** STW resolution inputs — SI only at the API boundary. */
export const StwInputSchema = z
  .object({
    speedThroughWaterMs: nonNeg.optional(),
    sogMs: nonNeg.optional(),
    sogVector: Velocity2Schema.optional(),
    predictedCurrent: PredictedCurrentSchema.optional(),
  })
  .refine(
    (v) =>
      v.speedThroughWaterMs !== undefined ||
      v.sogMs !== undefined ||
      (v.sogVector !== undefined && v.predictedCurrent !== undefined),
    {
      message:
        'provide speedThroughWaterMs, sogMs, or sogVector+predictedCurrent',
    },
  );

const BallShapeSchema = z.enum(['sphere', 'pancake', 'torpedo']);

const DownriggerRigSchema = z.object({
  delivery: z.literal('downrigger'),
  cableOutM: nonNeg,
  ballMassKg: positive,
  ballShape: BallShapeSchema,
  cableDiameterM: positive,
  cableLinearMassKgPerM: positive.optional(),
  terminalDragN: nonNeg,
  releaseDropM: nonNeg.default(0),
  leaderLengthM: nonNeg.default(0),
  leaderDiameterM: positive.optional(),
  attractorDragN: nonNeg.optional(),
});

const DiverRigSchema = z.object({
  delivery: z.literal('diver'),
  model: z.string().min(1),
  size: z.string().min(1),
  settingIndex: z.number().int(),
  lineOutM: nonNeg,
  lineType: z.string().optional(),
  lineDiameterM: positive.optional(),
  addedWeightKg: nonNeg.optional(),
});

const LeadcoreRigSchema = z.object({
  delivery: z.literal('leadcore'),
  colorsOut: nonNeg,
  backingSagM: nonNeg.optional(),
  leaderRiseM: nonNeg.optional(),
});

const WireRigSchema = z.object({
  delivery: z.literal('wire'),
  wireOutM: nonNeg,
  backingSagM: nonNeg.optional(),
  leaderRiseM: nonNeg.optional(),
});

const WeightedRigSchema = z.object({
  delivery: z.literal('weighted'),
  lineOutM: nonNeg,
  lineDiameterM: positive,
  lineLinearMassKgPerM: positive.optional(),
  tipMassKg: nonNeg,
  tipShape: BallShapeSchema.default('sphere'),
  terminalDragN: nonNeg.default(0),
});

const FlatlineRigSchema = z.object({
  delivery: z.literal('flatline'),
  lineOutM: nonNeg,
  lineDiameterM: positive,
  lineLinearMassKgPerM: positive.optional(),
  terminalDragN: nonNeg.default(0),
});

export const RigSchema = z.discriminatedUnion('delivery', [
  DownriggerRigSchema,
  DiverRigSchema,
  LeadcoreRigSchema,
  WireRigSchema,
  WeightedRigSchema,
  FlatlineRigSchema,
]);

const CalibrationFitSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(['GLOBAL', 'BOAT', 'RIG']),
  boatId: z.string().optional(),
  rigId: z.string().optional(),
  params: z.object({ ballCd: z.number().positive() }),
  rmseM: z.number().nonnegative(),
  sampleN: z.number().int().positive(),
  fittedAt: z.string().datetime(),
  supersededAt: z.string().datetime().optional(),
});

export const CalcDepthBodySchema = z.object({
  stw: StwInputSchema,
  rig: RigSchema,
  /** Optional boat/rig ids for narrowest calibration fit selection. */
  boatId: z.string().optional(),
  rigId: z.string().optional(),
  /** Active calibration fits; engine picks the narrowest matching scope. */
  calibrationFits: z.array(CalibrationFitSchema).optional(),
});

export const SpreadRigSchema = z.object({
  id: z.string().min(1),
  /** Metres to starboard of centerline (port negative). */
  lateralOffsetM: z.number().finite(),
  rig: RigSchema,
});

export const CalcSpreadBodySchema = z.object({
  stw: StwInputSchema,
  /** Yaw rate rad/s; positive = starboard turn. */
  omegaRadPerS: z.number().finite(),
  rigs: z.array(SpreadRigSchema).min(1),
  tangleThresholdM: positive.optional(),
});

export type CalcDepthBody = z.infer<typeof CalcDepthBodySchema>;
export type CalcSpreadBody = z.infer<typeof CalcSpreadBodySchema>;
export type RigBody = z.infer<typeof RigSchema>;
export type StwBody = z.infer<typeof StwInputSchema>;
