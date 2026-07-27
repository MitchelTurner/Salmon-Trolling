import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { CalcDepthDto, CalcSpreadDto } from './calc.dto.js';
import { CalcService } from './calc.service.js';

@Controller('calc')
@UseGuards(ThrottlerGuard)
export class CalcController {
  constructor(private readonly calc: CalcService) {}

  @Post('depth')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  depth(@Body() body: CalcDepthDto, @Res({ passthrough: true }) res: Response) {
    const result = this.calc.depth(body);
    if (!result.ok) {
      res.status(result.status);
      res.type('application/problem+json');
      return {
        type: result.type,
        title: result.title,
        status: result.status,
        detail: result.detail,
        generatedAt: result.generatedAt,
      };
    }
    return {
      generatedAt: result.generatedAt,
      result: result.result,
    };
  }

  @Post('spread')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  spread(
    @Body() body: CalcSpreadDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = this.calc.spread(body);
    if (!result.ok) {
      res.status(result.status);
      res.type('application/problem+json');
      return {
        type: result.type,
        title: result.title,
        status: result.status,
        detail: result.detail,
        generatedAt: result.generatedAt,
      };
    }
    return {
      generatedAt: result.generatedAt,
      results: result.results,
      spread: result.spread,
    };
  }
}
