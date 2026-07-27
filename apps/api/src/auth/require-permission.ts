import {
  ForbiddenException,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  mixin,
  type Type,
} from '@nestjs/common';
import { roleAllows, type Permission } from '@troll/shared';
import type { AuthedRequest } from './org-auth.guard.js';

/** Nest guard factory: require a permission on the authenticated membership role. */
export function RequirePermission(
  permission: Permission,
): Type<CanActivate> {
  @Injectable()
  class PermissionGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<AuthedRequest>();
      const role = req.orgContext?.role;
      if (!role || !roleAllows(role, permission)) {
        throw new ForbiddenException({
          type: 'https://troll.app/problems/forbidden',
          title: 'Forbidden',
          detail: `role lacks permission ${permission}`,
        });
      }
      return true;
    }
  }
  return mixin(PermissionGuard);
}
