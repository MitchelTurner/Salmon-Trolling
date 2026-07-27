import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { RequirePermission } from '../auth/require-permission.js';
import { GenerateGuestReportDto } from './guest-reports.dto.js';
import { GuestReportsService } from './guest-reports.service.js';

@Controller()
export class GuestReportsController {
  constructor(private readonly reports: GuestReportsService) {}

  /** POST /org/trips/:id/report — generate + email guest catch report. */
  @Post('org/trips/:id/report')
  @UseGuards(OrgAuthGuard, RequirePermission('trip:write'))
  async generate(
    @Req() req: AuthedRequest,
    @Param('id') tripId: string,
    @Body() body: GenerateGuestReportDto,
  ) {
    try {
      const report = await this.reports.generate(
        req.orgContext!.orgId,
        tripId,
        body,
      );
      return { generatedAt: report.createdAt, report };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'report failed';
      if (message.includes('not found')) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/trip-not-found',
          title: 'Trip not found',
          detail: message,
        });
      }
      throw new BadRequestException({
        type: 'https://troll.app/problems/guest-report',
        title: 'Report failed',
        detail: message,
      });
    }
  }

  /** GET /r/:slug — public shareable guest report (no auth). */
  @Get('r/:slug')
  async publicReport(@Param('slug') slug: string) {
    const report = await this.reports.getPublic(slug);
    if (!report) {
      throw new NotFoundException({
        type: 'https://troll.app/problems/report-not-found',
        title: 'Report not found',
        detail: 'No guest report for this link',
      });
    }
    return { generatedAt: report.createdAt, report };
  }
}
