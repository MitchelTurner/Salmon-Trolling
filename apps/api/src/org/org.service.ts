import { Inject, Injectable } from '@nestjs/common';
import { canManageBilling, type Role } from '@troll/shared';
import { randomUUID } from 'node:crypto';
import {
  ORG_BOAT_STORE,
  ORG_CREW_STORE,
  type OrgBoat,
  type OrgBoatStore,
  type OrgCrewMember,
  type OrgCrewStore,
} from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

@Injectable()
export class OrgService {
  constructor(
    @Inject(ORG_BOAT_STORE) private readonly boats: OrgBoatStore,
    @Inject(ORG_CREW_STORE) private readonly crew: OrgCrewStore,
  ) {}

  listBoats(orgId: string): Promise<OrgBoat[]> {
    return this.boats.list(orgId);
  }

  async createBoat(
    orgId: string,
    input: {
      name: string;
      hasPaddleWheel?: boolean;
      hasN2K?: boolean;
      hasProbe?: boolean;
    },
  ): Promise<OrgBoat> {
    return this.boats.create({
      id: newId('boat'),
      orgId,
      name: input.name.trim(),
      hasPaddleWheel: input.hasPaddleWheel ?? false,
      hasN2K: input.hasN2K ?? false,
      hasProbe: input.hasProbe ?? false,
    });
  }

  listCrew(orgId: string): Promise<OrgCrewMember[]> {
    return this.crew.list(orgId);
  }

  async inviteCrew(
    orgId: string,
    input: {
      email: string;
      displayName: string;
      role: Exclude<Role, 'OWNER'>;
      boatId?: string;
    },
  ): Promise<OrgCrewMember> {
    if (input.boatId) {
      const boat = await this.boats.get(orgId, input.boatId);
      if (!boat) throw new Error('boat not found');
    }

    const member: OrgCrewMember = {
      id: newId('mem'),
      orgId,
      userId: newId('user'),
      email: input.email.toLowerCase(),
      displayName: input.displayName.trim(),
      role: input.role,
      boatIds: input.boatId ? [input.boatId] : [],
    };
    return this.crew.invite(member);
  }

  /** Deckhands must not manage billing — used by billing guards/tests. */
  assertBillingAllowed(role: Role): void {
    if (!canManageBilling(role)) {
      throw new Error('role cannot manage billing');
    }
  }
}
