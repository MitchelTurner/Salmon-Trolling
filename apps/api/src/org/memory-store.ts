import type {
  OrgBoat,
  OrgBoatStore,
  OrgCrewMember,
  OrgCrewStore,
} from './types.js';

export class MemoryOrgBoatStore implements OrgBoatStore {
  private readonly boats = new Map<string, OrgBoat>();

  async list(orgId: string): Promise<OrgBoat[]> {
    return [...this.boats.values()].filter((b) => b.orgId === orgId);
  }

  async create(boat: OrgBoat): Promise<OrgBoat> {
    this.boats.set(boat.id, boat);
    return boat;
  }

  async get(orgId: string, boatId: string): Promise<OrgBoat | null> {
    const boat = this.boats.get(boatId);
    if (!boat || boat.orgId !== orgId) return null;
    return boat;
  }
}

export class MemoryOrgCrewStore implements OrgCrewStore {
  private readonly members = new Map<string, OrgCrewMember>();

  private key(orgId: string, userId: string): string {
    return `${orgId}:${userId}`;
  }

  async list(orgId: string): Promise<OrgCrewMember[]> {
    return [...this.members.values()].filter((m) => m.orgId === orgId);
  }

  async invite(member: OrgCrewMember): Promise<OrgCrewMember> {
    this.members.set(this.key(member.orgId, member.userId), member);
    return member;
  }

  async assignBoat(
    orgId: string,
    userId: string,
    boatId: string,
  ): Promise<OrgCrewMember | null> {
    const existing = this.members.get(this.key(orgId, userId));
    if (!existing) return null;
    const boatIds = existing.boatIds.includes(boatId)
      ? existing.boatIds
      : [...existing.boatIds, boatId];
    const next: OrgCrewMember = { ...existing, boatIds };
    this.members.set(this.key(orgId, userId), next);
    return next;
  }
}
