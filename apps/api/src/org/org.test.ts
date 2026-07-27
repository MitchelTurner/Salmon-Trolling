import { describe, expect, it } from 'vitest';
import { canManageBilling, roleAllows } from '@troll/shared';
import {
  MemoryOrgBoatStore,
  MemoryOrgCrewStore,
} from './memory-store.js';
import { OrgService } from './org.service.js';

describe('OrgService multi-boat and crew', () => {
  function setup() {
    const boats = new MemoryOrgBoatStore();
    const crew = new MemoryOrgCrewStore();
    const org = new OrgService(boats, crew);
    return { org, boats, crew };
  }

  it('creates multiple boats under one org', async () => {
    const { org } = setup();
    const a = await org.createBoat('org_1', { name: 'Northern Light' });
    const b = await org.createBoat('org_1', {
      name: 'Sea Bear',
      hasPaddleWheel: true,
    });
    const listed = await org.listBoats('org_1');
    expect(listed).toHaveLength(2);
    expect(listed.map((x) => x.name).sort()).toEqual([
      'Northern Light',
      'Sea Bear',
    ]);
    expect(a.orgId).toBe('org_1');
    expect(b.hasPaddleWheel).toBe(true);
  });

  it('invites crew onto a boat without billing rights', async () => {
    const { org } = setup();
    const boat = await org.createBoat('org_1', { name: 'Northern Light' });
    const deckhand = await org.inviteCrew('org_1', {
      email: 'deck@example.com',
      displayName: 'Deckhand',
      role: 'CREW',
      boatId: boat.id,
    });

    expect(deckhand.role).toBe('CREW');
    expect(deckhand.boatIds).toEqual([boat.id]);
    expect(canManageBilling(deckhand.role)).toBe(false);
    expect(roleAllows(deckhand.role, 'catch:write')).toBe(true);
    expect(roleAllows(deckhand.role, 'billing:manage')).toBe(false);

    await expect(async () => {
      org.assertBillingAllowed(deckhand.role);
    }).rejects.toThrow(/billing/);
  });

  it('lets captains invite crew but not manage billing', () => {
    expect(roleAllows('CAPTAIN', 'crew:invite')).toBe(true);
    expect(roleAllows('CAPTAIN', 'boat:create')).toBe(true);
    expect(canManageBilling('CAPTAIN')).toBe(false);
    expect(canManageBilling('OWNER')).toBe(true);
    expect(roleAllows('VIEWER', 'catch:write')).toBe(false);
  });
});
