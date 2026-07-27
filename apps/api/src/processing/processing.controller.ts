import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { RequirePermission } from '../auth/require-permission.js';
import { CreateManifestDto } from './processing.dto.js';
import { ProcessingService } from './processing.service.js';

@Controller('org/processing')
@UseGuards(OrgAuthGuard)
export class ProcessingController {
  constructor(private readonly processing: ProcessingService) {}

  /** GET /org/processing */
  @Get()
  @UseGuards(RequirePermission('trip:read'))
  async list(@Req() req: AuthedRequest) {
    const manifests = await this.processing.list(req.orgContext!.orgId);
    return { generatedAt: new Date().toISOString(), manifests };
  }

  /** POST /org/processing — create a processor-acceptable manifest. */
  @Post()
  @UseGuards(RequirePermission('trip:write'))
  async create(@Req() req: AuthedRequest, @Body() body: CreateManifestDto) {
    try {
      const manifest = await this.processing.create(
        req.orgContext!.orgId,
        body,
      );
      return { generatedAt: manifest.createdAt, manifest };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/processing-manifest',
        title: 'Manifest failed',
        detail: err instanceof Error ? err.message : 'manifest failed',
      });
    }
  }
}
