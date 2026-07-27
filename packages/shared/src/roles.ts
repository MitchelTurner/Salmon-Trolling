/**
 * Charter role model (08-charter-derby.md).
 * Deckhands (CREW) log on a boat device without org billing access.
 */

import { z } from 'zod';

export const RoleSchema = z.enum(['OWNER', 'CAPTAIN', 'CREW', 'VIEWER']);
export type Role = z.infer<typeof RoleSchema>;

export const ROLES = RoleSchema.options;

export type Permission =
  | 'billing:manage'
  | 'org:manage'
  | 'boat:create'
  | 'boat:read'
  | 'crew:invite'
  | 'crew:read'
  | 'trip:write'
  | 'trip:read'
  | 'catch:write'
  /** Dock weigh-in station for derbies (08-charter-derby.md). */
  | 'derby:weighin';

const ALL: readonly Permission[] = [
  'billing:manage',
  'org:manage',
  'boat:create',
  'boat:read',
  'crew:invite',
  'crew:read',
  'trip:write',
  'trip:read',
  'catch:write',
  'derby:weighin',
];

const PERMISSIONS_BY_ROLE: Record<Role, readonly Permission[]> = {
  OWNER: ALL,
  CAPTAIN: [
    'boat:create',
    'boat:read',
    'crew:invite',
    'crew:read',
    'trip:write',
    'trip:read',
    'catch:write',
    'derby:weighin',
  ],
  CREW: [
    'boat:read',
    'crew:read',
    'trip:write',
    'trip:read',
    'catch:write',
    'derby:weighin',
  ],
  VIEWER: ['boat:read', 'crew:read', 'trip:read'],
};

export function permissionsFor(role: Role): readonly Permission[] {
  return PERMISSIONS_BY_ROLE[role];
}

export function roleAllows(role: Role, permission: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role].includes(permission);
}

/** CREW/VIEWER must never reach billing — deckhand on boat device. */
export function canManageBilling(role: Role): boolean {
  return roleAllows(role, 'billing:manage');
}
