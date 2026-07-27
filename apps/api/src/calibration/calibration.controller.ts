import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { RequirePermission } from '../auth/require-permission.js';
import { RunCalibrationBodyDto } from './calibration.dto.js';
import { CalibrationService } from './calibration.service.js';

@Controller('calibration')
@UseGuards(OrgAuthGuard)
export class CalibrationController {
  constructor(private readonly calibration: CalibrationService) {}

  /** POST /calibration/fit — run fitting job and store with RMSE. */
  @Post('fit')
  @UseGuards(RequirePermission('trip:write'))
  async fit(@Body() body: RunCalibrationBodyDto) {
    try {
      const fit = await this.calibration.runAndStore(body);
      return { generatedAt: fit.fittedAt, fit };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/calibration-fit',
        title: 'Calibration failed',
        detail: err instanceof Error ? err.message : 'fit failed',
      });
    }
  }

  /** GET /calibration/fits — active fits for boat/rig selection. */
  @Get('fits')
  @UseGuards(RequirePermission('trip:read'))
  async list(
    @Query('boatId') boatId?: string,
    @Query('rigId') rigId?: string,
  ) {
    const fits = await this.calibration.listActive({ boatId, rigId });
    return { generatedAt: new Date().toISOString(), fits };
  }
}
