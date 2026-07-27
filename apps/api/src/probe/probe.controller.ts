import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { RequirePermission } from '../auth/require-permission.js';
import { ingestProbeSession } from './ingest.js';
import { IngestProbeBodyDto } from './probe.dto.js';

@Controller('probe')
@UseGuards(OrgAuthGuard)
export class ProbeController {
  /** POST /probe/samples — batch upload from a paired probe. */
  @Post('samples')
  @UseGuards(RequirePermission('catch:write'))
  ingest(@Req() req: AuthedRequest, @Body() body: IngestProbeBodyDto) {
    const samples = ingestProbeSession({
      sessionStartedAt: body.sessionStartedAt,
      clockOffsetMs: body.clockOffsetMs,
      samples: body.samples,
      track: body.track,
      rigTimeline: body.rigTimeline,
    });

    return {
      generatedAt: new Date().toISOString(),
      orgId: req.orgContext!.orgId,
      probeId: body.probeId,
      tripId: body.tripId,
      sampleCount: samples.length,
      samples,
    };
  }
}
