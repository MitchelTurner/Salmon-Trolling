import type { GuestCatchReport } from '@troll/shared';

export const GUEST_REPORT_STORE = Symbol('GUEST_REPORT_STORE');
export const TRIP_CATCH_SOURCE = Symbol('TRIP_CATCH_SOURCE');
export const EMAIL_GATEWAY = Symbol('EMAIL_GATEWAY');

export type TripCatchSourceRow = {
  readonly id: string;
  readonly orgId: string;
  readonly startedAt: string;
  readonly closedAt: string | null;
  readonly catches: ReadonlyArray<{
    readonly id: string;
    readonly species: string;
    readonly lengthM?: number;
    readonly massKg?: number;
    readonly kept: boolean;
    readonly t: string;
    readonly photoKeys: readonly string[];
  }>;
};

export interface TripCatchSource {
  getTrip(orgId: string, tripId: string): Promise<TripCatchSourceRow | null>;
}

export interface GuestReportStore {
  put(report: GuestCatchReport): Promise<void>;
  getById(id: string): Promise<GuestCatchReport | null>;
  getBySharePath(sharePath: string): Promise<GuestCatchReport | null>;
}

export type OutboundEmail = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
};

export interface EmailGateway {
  send(email: OutboundEmail): Promise<{ id: string }>;
}
