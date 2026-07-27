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
import { CreateBoatBodyDto, InviteCrewBodyDto } from './org.dto.js';
import { OrgService } from './org.service.js';

@Controller('org')
@UseGuards(OrgAuthGuard)
export class OrgController {
  constructor(private readonly org: OrgService) {}

  /** GET /org/boats */
  @Get('boats')
  @UseGuards(RequirePermission('boat:read'))
  async listBoats(@Req() req: AuthedRequest) {
    const boats = await this.org.listBoats(req.orgContext!.orgId);
    return { generatedAt: new Date().toISOString(), boats };
  }

  /** POST /org/boats */
  @Post('boats')
  @UseGuards(RequirePermission('boat:create'))
  async createBoat(@Req() req: AuthedRequest, @Body() body: CreateBoatBodyDto) {
    const boat = await this.org.createBoat(req.orgContext!.orgId, body);
    return { generatedAt: new Date().toISOString(), boat };
  }

  /** GET /org/crew */
  @Get('crew')
  @UseGuards(RequirePermission('crew:read'))
  async listCrew(@Req() req: AuthedRequest) {
    const crew = await this.org.listCrew(req.orgContext!.orgId);
    return { generatedAt: new Date().toISOString(), crew };
  }

  /** POST /org/crew/invite */
  @Post('crew/invite')
  @UseGuards(RequirePermission('crew:invite'))
  async inviteCrew(@Req() req: AuthedRequest, @Body() body: InviteCrewBodyDto) {
    try {
      const member = await this.org.inviteCrew(req.orgContext!.orgId, {
        email: body.email,
        displayName: body.displayName,
        role: body.role,
        boatId: body.boatId,
      });
      return { generatedAt: new Date().toISOString(), member };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/crew-invite',
        title: 'Invite failed',
        detail: err instanceof Error ? err.message : 'invite failed',
      });
    }
  }
}
