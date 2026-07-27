import { describe, expect, it } from 'vitest';
import {
  ROLES,
  canManageBilling,
  canResolveDerbyDispute,
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

  it('lets station crew weigh in; viewers cannot', () => {
    expect(roleAllows('CREW', 'derby:weighin')).toBe(true);
    expect(roleAllows('CAPTAIN', 'derby:weighin')).toBe(true);
    expect(roleAllows('OWNER', 'derby:weighin')).toBe(true);
    expect(roleAllows('VIEWER', 'derby:weighin')).toBe(false);
  });

  it('lets crew open disputes; only captains/owners resolve', () => {
    expect(roleAllows('CREW', 'derby:dispute')).toBe(true);
    expect(roleAllows('VIEWER', 'derby:dispute')).toBe(false);
    expect(canResolveDerbyDispute('CREW')).toBe(false);
    expect(canResolveDerbyDispute('CAPTAIN')).toBe(true);
    expect(canResolveDerbyDispute('OWNER')).toBe(true);
  });
});
