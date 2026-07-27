import type { BookingStatus } from '@troll/shared';

export const BOOKING_STORE = Symbol('BOOKING_STORE');
export const WAIVER_STORE = Symbol('WAIVER_STORE');
export const CREW_SHIFT_STORE = Symbol('CREW_SHIFT_STORE');

export type BookingRecord = {
  readonly id: string;
  readonly orgId: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly boatId: string;
  readonly tripDate: string;
  readonly partySize: number;
  readonly depositAmountCents: number;
  readonly status: BookingStatus;
  readonly checkoutSessionId?: string;
  readonly checkoutUrl?: string;
  readonly depositPaidAt?: string;
  readonly cancelledAt?: string;
  readonly cancelReason?: string;
  readonly rebookedFromId?: string;
  readonly rebookedToId?: string;
  readonly createdAt: string;
};

export type WaiverRecord = {
  readonly id: string;
  readonly orgId: string;
  readonly bookingId: string;
  readonly signerName: string;
  readonly signatureData: string;
  readonly signedAt: string;
};

export type CrewShiftRecord = {
  readonly id: string;
  readonly orgId: string;
  readonly boatId: string;
  readonly userId: string;
  readonly date: string;
  readonly role: 'CAPTAIN' | 'CREW';
  readonly createdAt: string;
};

export interface BookingStore {
  put(row: BookingRecord): Promise<void>;
  get(orgId: string, id: string): Promise<BookingRecord | null>;
  list(orgId: string): Promise<BookingRecord[]>;
}

export interface WaiverStore {
  put(row: WaiverRecord): Promise<void>;
  getByBooking(bookingId: string): Promise<WaiverRecord | null>;
}

export interface CrewShiftStore {
  put(row: CrewShiftRecord): Promise<void>;
  list(orgId: string, date?: string): Promise<CrewShiftRecord[]>;
}
