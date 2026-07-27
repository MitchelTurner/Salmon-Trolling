import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const TrackPointSchema = z.object({
  t: z.string().datetime(),
  lat: z.number(),
  lon: z.number(),
});

const RigTimelineSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime().optional(),
  rigSnapshot: z.record(z.unknown()),
});

const RawSampleSchema = z.object({
  tOffsetMs: z.number().int().nonnegative(),
  depthM: z.number(),
  tempC: z.number().optional(),
  speedMs: z.number().optional(),
});

export const IngestProbeBodySchema = z.object({
  probeId: z.string().min(1),
  tripId: z.string().min(1).optional(),
  sessionStartedAt: z.string().datetime(),
  clockOffsetMs: z.number().int(),
  samples: z.array(RawSampleSchema).min(1),
  track: z.array(TrackPointSchema).default([]),
  rigTimeline: z.array(RigTimelineSchema).default([]),
});

export class IngestProbeBodyDto extends createZodDto(IngestProbeBodySchema) {}
