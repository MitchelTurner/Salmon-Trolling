import type { Role } from '@troll/shared';

export const ORG_BOAT_STORE = Symbol('ORG_BOAT_STORE');
export const ORG_CREW_STORE = Symbol('ORG_CREW_STORE');

export type OrgBoat = {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly hasPaddleWheel: boolean;
  readonly hasN2K: boolean;
  readonly hasProbe: boolean;
};

export type OrgCrewMember = {
  readonly id: string;
  readonly orgId: string;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: Role;
  /** Boats this member is assigned to (empty = unassigned). */
  readonly boatIds: readonly string[];
};

export interface OrgBoatStore {
  list(orgId: string): Promise<OrgBoat[]>;
  create(boat: OrgBoat): Promise<OrgBoat>;
  get(orgId: string, boatId: string): Promise<OrgBoat | null>;
}

export interface OrgCrewStore {
  list(orgId: string): Promise<OrgCrewMember[]>;
  invite(member: OrgCrewMember): Promise<OrgCrewMember>;
  assignBoat(
    orgId: string,
    userId: string,
    boatId: string,
  ): Promise<OrgCrewMember | null>;
}
