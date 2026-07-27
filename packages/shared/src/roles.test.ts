import { describe, expect, it } from 'vitest';
import {
  ROLES,
  canManageBilling,
  permissionsFor,
  roleAllows,
} from './roles.js';

describe('charter roles', () => {
  it('defines owner/captain/crew/viewer', () => {
    expect(ROLES).toEqual(['OWNER', 'CAPTAIN', 'CREW', 'VIEWER']);
  });

  it('keeps billing off boat-device roles', () => {
    expect(canManageBilling('OWNER')).toBe(true);
    expect(canManageBilling('CAPTAIN')).toBe(false);
    expect(canManageBilling('CREW')).toBe(false);
    expect(canManageBilling('VIEWER')).toBe(false);
  });

  it('lets crew write catches and trips', () => {
    expect(roleAllows('CREW', 'catch:write')).toBe(true);
    expect(roleAllows('CREW', 'trip:write')).toBe(true);
    expect(roleAllows('CREW', 'org:manage')).toBe(false);
    expect(permissionsFor('VIEWER')).not.toContain('trip:write');
  });
});
