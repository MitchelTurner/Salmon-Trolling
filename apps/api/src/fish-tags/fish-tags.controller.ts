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
import { IssueFishTagDto } from './fish-tags.dto.js';
import { FishTagsService } from './fish-tags.service.js';

@Controller()
export class FishTagsController {
  constructor(private readonly tags: FishTagsService) {}

  /** POST /org/tags — issue a printable dock tag for a catch. */
  @Post('org/tags')
  @UseGuards(OrgAuthGuard, RequirePermission('catch:write'))
  async issue(@Req() req: AuthedRequest, @Body() body: IssueFishTagDto) {
    try {
      const tag = await this.tags.issue(req.orgContext!.orgId, body);
      return {
        generatedAt: tag.createdAt,
        tag: {
          id: tag.id,
          catchId: tag.catchId,
          code: tag.code,
          guestName: tag.guestName,
          guestEmail: tag.guestEmail,
          species: tag.species,
          statusPath: tag.statusPath,
          createdAt: tag.createdAt,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'tag failed';
      if (message.includes('not found')) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/catch-not-found',
          title: 'Catch not found',
          detail: message,
        });
      }
      throw new BadRequestException({
        type: 'https://troll.app/problems/fish-tag',
        title: 'Tag failed',
        detail: message,
      });
    }
  }

  /** GET /tag/:code — public guest status page data. */
  @Get('tag/:code')
  async status(@Param('code') code: string) {
    const status = await this.tags.status(code);
    if (!status) {
      throw new NotFoundException({
        type: 'https://troll.app/problems/tag-not-found',
        title: 'Tag not found',
        detail: 'No fish tag for this code',
      });
    }
    return { generatedAt: status.updatedAt, status };
  }
}
