import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
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
}
