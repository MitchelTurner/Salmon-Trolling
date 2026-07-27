import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { REGION_IDS, type RegionId } from '@troll/shared';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { BundlesService } from './bundles.service.js';

@Controller('bundles')
@UseGuards(OrgAuthGuard)
export class BundlesController {
  constructor(private readonly bundles: BundlesService) {}

  /**
   * GET /bundles/:regionId?window=48h
   * Returns the signed dock conditions bundle for the aligned UTC window.
   */
  @Get(':regionId')
  async getBundle(
    @Param('regionId') regionId: string,
    @Query('window') window?: string,
  ) {
    if (!(REGION_IDS as readonly string[]).includes(regionId)) {
      throw new NotFoundException({
        type: 'https://troll.app/problems/unknown-region',
        title: 'Unknown region',
        detail: `Unknown regionId: ${regionId}`,
      });
    }

    const windowHours = parseWindowHours(window);
    const bundle = await this.bundles.getBundle({
      regionId: regionId as RegionId,
      windowHours,
    });

    return {
      ...bundle,
      generatedAt: bundle.meta.generatedAt,
    };
  }
}

function parseWindowHours(window?: string): number {
  if (!window) return 48;
  const match = /^(\d+)\s*h$/i.exec(window.trim());
  if (!match) return 48;
  return Number(match[1]);
}
