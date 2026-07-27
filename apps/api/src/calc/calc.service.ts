import { Injectable } from '@nestjs/common';
import {
  computeDepth,
  computeSpread,
  type CalcDepthOk,
  type CalcError,
  type CalcSpreadOk,
} from './depth.js';
import type { CalcDepthBody, CalcSpreadBody } from './schemas.js';

/**
 * Public calc endpoints. Aggregate request counts only — never log bodies.
 */
@Injectable()
export class CalcService {
  private depthRequests = 0;
  private spreadRequests = 0;

  depth(body: CalcDepthBody): (CalcDepthOk | CalcError) & {
    generatedAt: string;
  } {
    this.depthRequests += 1;
    const result = computeDepth(body);
    return { ...result, generatedAt: new Date().toISOString() };
  }

  spread(body: CalcSpreadBody): (CalcSpreadOk | CalcError) & {
    generatedAt: string;
  } {
    this.spreadRequests += 1;
    const result = computeSpread(body);
    return { ...result, generatedAt: new Date().toISOString() };
  }

  /** Aggregate counters for ops — no per-request input retention. */
  counts(): { depth: number; spread: number } {
    return { depth: this.depthRequests, spread: this.spreadRequests };
  }
}
