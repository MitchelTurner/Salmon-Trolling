import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { RequirePermission } from '../auth/require-permission.js';
import {
  CompleteDerbyRegistrationDto,
  CreateWeighInDto,
  OpenDisputeDto,
  RegisterDerbyDto,
  ResolveDisputeDto,
  VoidWeighInDto,
} from './derbies.dto.js';
import { DerbiesService } from './derbies.service.js';

@Controller('derbies')
export class DerbiesController {
  constructor(private readonly derbies: DerbiesService) {}

  /** GET /derbies/:slug — public leaderboard, no login. */
  @Get(':slug')
  async leaderboard(@Param('slug') slug: string) {
    const board = await this.derbies.leaderboard(slug);
    if (!board) {
      throw new NotFoundException({
        type: 'https://troll.app/problems/derby-not-found',
        title: 'Derby not found',
        detail: `No derby for slug "${slug}"`,
      });
    }
    return {
      generatedAt: new Date().toISOString(),
      leaderboard: board,
    };
  }

  /** POST /derbies/:slug/register — Stripe checkout, waiver, pending ticket. */
  @Post(':slug/register')
  async register(@Param('slug') slug: string, @Body() body: RegisterDerbyDto) {
    try {
      const receipt = await this.derbies.register(slug, body);
      return {
        generatedAt: new Date().toISOString(),
        registration: receipt,
      };
    } catch (err) {
      return this.mapError(err, 'register');
    }
  }

  /**
   * POST /derbies/:slug/register/complete — issue ticket after Stripe payment.
   * Idempotent by checkout session id.
   */
  @Post(':slug/register/complete')
  async complete(
    @Param('slug') slug: string,
    @Body() body: CompleteDerbyRegistrationDto,
  ) {
    try {
      const receipt = await this.derbies.completeRegistration(slug, body);
      return {
        generatedAt: new Date().toISOString(),
        registration: receipt,
      };
    } catch (err) {
      return this.mapError(err, 'register-complete');
    }
  }

  /**
   * GET /derbies/:slug/tickets — paid roster for station prefetch (offline dock).
   */
  @Get(':slug/tickets')
  @UseGuards(OrgAuthGuard, RequirePermission('derby:weighin'))
  async tickets(@Req() req: AuthedRequest, @Param('slug') slug: string) {
    try {
      const tickets = await this.derbies.listTickets(
        slug,
        req.orgContext!.orgId,
      );
      if (!tickets) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/derby-not-found',
          title: 'Derby not found',
          detail: `No derby for slug "${slug}"`,
        });
      }
      return { generatedAt: new Date().toISOString(), tickets };
    } catch (err) {
      return this.mapError(err, 'tickets');
    }
  }

  /** GET /derbies/:slug/audit — append-only trail for prize disputes. */
  @Get(':slug/audit')
  @UseGuards(OrgAuthGuard, RequirePermission('derby:dispute'))
  async audit(@Req() req: AuthedRequest, @Param('slug') slug: string) {
    try {
      const events = await this.derbies.listAudit(slug, req.orgContext!.orgId);
      if (!events) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/derby-not-found',
          title: 'Derby not found',
          detail: `No derby for slug "${slug}"`,
        });
      }
      return { generatedAt: new Date().toISOString(), events };
    } catch (err) {
      return this.mapError(err, 'audit');
    }
  }

  /** GET /derbies/:slug/disputes */
  @Get(':slug/disputes')
  @UseGuards(OrgAuthGuard, RequirePermission('derby:dispute'))
  async listDisputes(@Req() req: AuthedRequest, @Param('slug') slug: string) {
    try {
      const disputes = await this.derbies.listDisputes(
        slug,
        req.orgContext!.orgId,
      );
      if (!disputes) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/derby-not-found',
          title: 'Derby not found',
          detail: `No derby for slug "${slug}"`,
        });
      }
      return { generatedAt: new Date().toISOString(), disputes };
    } catch (err) {
      return this.mapError(err, 'disputes');
    }
  }

  /** POST /derbies/:slug/weighins — station operator role; offline-idempotent. */
  @Post(':slug/weighins')
  @UseGuards(OrgAuthGuard, RequirePermission('derby:weighin'))
  async weighIn(
    @Req() req: AuthedRequest,
    @Param('slug') slug: string,
    @Body() body: CreateWeighInDto,
  ) {
    try {
      const weighIn = await this.derbies.createWeighIn(
        slug,
        req.orgContext!.orgId,
        req.orgContext!.userId,
        body,
      );
      return { generatedAt: new Date().toISOString(), weighIn };
    } catch (err) {
      return this.mapError(err, 'weighin');
    }
  }

  /** POST /derbies/:slug/weighins/:weighInId/void */
  @Post(':slug/weighins/:weighInId/void')
  @UseGuards(OrgAuthGuard, RequirePermission('derby:weighin'))
  async voidWeighIn(
    @Req() req: AuthedRequest,
    @Param('slug') slug: string,
    @Param('weighInId') weighInId: string,
    @Body() body: VoidWeighInDto,
  ) {
    try {
      const weighIn = await this.derbies.voidWeighIn(
        slug,
        req.orgContext!.orgId,
        req.orgContext!.userId,
        weighInId,
        body,
      );
      return { generatedAt: new Date().toISOString(), weighIn };
    } catch (err) {
      return this.mapError(err, 'void');
    }
  }

  /** POST /derbies/:slug/disputes — open a prize dispute. */
  @Post(':slug/disputes')
  @UseGuards(OrgAuthGuard, RequirePermission('derby:dispute'))
  async openDispute(
    @Req() req: AuthedRequest,
    @Param('slug') slug: string,
    @Body() body: OpenDisputeDto,
  ) {
    try {
      const dispute = await this.derbies.openDispute(
        slug,
        req.orgContext!.orgId,
        req.orgContext!.userId,
        body,
      );
      return { generatedAt: new Date().toISOString(), dispute };
    } catch (err) {
      return this.mapError(err, 'dispute-open');
    }
  }

  /** POST /derbies/:slug/disputes/:disputeId/resolve — captain/owner only. */
  @Post(':slug/disputes/:disputeId/resolve')
  @UseGuards(OrgAuthGuard, RequirePermission('derby:dispute'))
  async resolveDispute(
    @Req() req: AuthedRequest,
    @Param('slug') slug: string,
    @Param('disputeId') disputeId: string,
    @Body() body: ResolveDisputeDto,
  ) {
    try {
      const dispute = await this.derbies.resolveDispute(
        slug,
        req.orgContext!.orgId,
        req.orgContext!.userId,
        req.orgContext!.role,
        disputeId,
        body,
      );
      return { generatedAt: new Date().toISOString(), dispute };
    } catch (err) {
      return this.mapError(err, 'dispute-resolve');
    }
  }

  private mapError(err: unknown, kind: string): never {
    const message = err instanceof Error ? err.message : `${kind} failed`;
    if (message.includes('not in this org')) {
      throw new ForbiddenException({
        type: 'https://troll.app/problems/forbidden',
        title: 'Forbidden',
        detail: message,
      });
    }
    if (message.includes('cannot resolve')) {
      throw new ForbiddenException({
        type: 'https://troll.app/problems/forbidden',
        title: 'Forbidden',
        detail: message,
      });
    }
    if (message.includes('not found')) {
      throw new NotFoundException({
        type: `https://troll.app/problems/derby-${kind}`,
        title: 'Not found',
        detail: message,
      });
    }
    throw new BadRequestException({
      type: `https://troll.app/problems/derby-${kind}`,
      title: 'Request rejected',
      detail: message,
    });
  }
}
