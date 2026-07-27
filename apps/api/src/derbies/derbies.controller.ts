import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  CompleteDerbyRegistrationDto,
  RegisterDerbyDto,
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
      const message = err instanceof Error ? err.message : 'register failed';
      if (message.includes('not found')) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/derby-not-found',
          title: 'Derby not found',
          detail: message,
        });
      }
      throw new BadRequestException({
        type: 'https://troll.app/problems/derby-register',
        title: 'Registration failed',
        detail: message,
      });
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
      const message = err instanceof Error ? err.message : 'complete failed';
      if (message.includes('not found')) {
        throw new NotFoundException({
          type: 'https://troll.app/problems/derby-registration-not-found',
          title: 'Registration not found',
          detail: message,
        });
      }
      throw new BadRequestException({
        type: 'https://troll.app/problems/derby-register-complete',
        title: 'Could not complete registration',
        detail: message,
      });
    }
  }
}
