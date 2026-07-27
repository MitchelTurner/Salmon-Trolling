import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { SyncRequestDto } from './sync.dto.js';
import { SyncService } from './sync.service.js';

@Controller('sync')
@UseGuards(ThrottlerGuard, OrgAuthGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  post(@Req() req: AuthedRequest, @Body() body: SyncRequestDto) {
    const org = req.orgContext;
    if (!org) {
      // Guard should have set this; belt-and-suspenders.
      throw new Error('missing org context');
    }
    // orgId is never read from the body — only from the authenticated context.
    return this.sync.sync(org, body);
  }
}
