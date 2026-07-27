import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { parseDevBearerToken, type OrgContext } from './org-context.js';

export type AuthedRequest = Request & { orgContext?: OrgContext };

@Injectable()
export class OrgAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const ctx = parseDevBearerToken(req.header('authorization') ?? undefined);
    if (!ctx) {
      throw new UnauthorizedException({
        type: 'https://troll.app/problems/unauthorized',
        title: 'Unauthorized',
        detail: 'Valid org-scoped bearer token required',
      });
    }
    req.orgContext = ctx;
    return true;
  }
}
