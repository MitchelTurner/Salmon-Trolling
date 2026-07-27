import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateBookingBody,
  CreateCrewShiftBody,
  SignWaiverBody,
} from '@troll/shared';
import { randomUUID } from 'node:crypto';
import {
  STRIPE_GATEWAY,
  type StripeGateway,
} from '../billing/types.js';
import {
  BOOKING_STORE,
  CREW_SHIFT_STORE,
  WAIVER_STORE,
  type BookingRecord,
  type BookingStore,
  type CrewShiftRecord,
  type CrewShiftStore,
  type WaiverRecord,
  type WaiverStore,
} from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKING_STORE) private readonly bookings: BookingStore,
    @Inject(WAIVER_STORE) private readonly waivers: WaiverStore,
    @Inject(CREW_SHIFT_STORE) private readonly shifts: CrewShiftStore,
    @Inject(STRIPE_GATEWAY) private readonly stripe: StripeGateway,
  ) {}

  list(orgId: string): Promise<BookingRecord[]> {
    return this.bookings.list(orgId);
  }

  async create(
    orgId: string,
    body: CreateBookingBody,
  ): Promise<BookingRecord> {
    const createdAt = new Date().toISOString();
    const id = newId('bk');
    const checkout = await this.stripe.createCheckoutSession({
      orgId,
      customerEmail: body.guestEmail,
      priceId: process.env.STRIPE_PRICE_DEPOSIT ?? 'price_deposit_test',
      mode: 'payment',
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      seasonPass: false,
    });

    const row: BookingRecord = {
      id,
      orgId,
      guestName: body.guestName.trim(),
      guestEmail: body.guestEmail.toLowerCase(),
      boatId: body.boatId,
      tripDate: body.tripDate,
      partySize: body.partySize,
      depositAmountCents: body.depositAmountCents,
      status: 'pending_deposit',
      checkoutSessionId: checkout.sessionId,
      checkoutUrl: checkout.url,
      createdAt,
    };
    await this.bookings.put(row);
    return row;
  }

  /** Mark deposit paid (webhook / test hook). */
  async confirmDeposit(
    orgId: string,
    bookingId: string,
  ): Promise<BookingRecord> {
    const row = await this.requireBooking(orgId, bookingId);
    if (row.status === 'cancelled') {
      throw new Error('cannot confirm a cancelled booking');
    }
    const next: BookingRecord = {
      ...row,
      status: 'confirmed',
      depositPaidAt: new Date().toISOString(),
    };
    await this.bookings.put(next);
    return next;
  }

  async signWaiver(
    orgId: string,
    body: SignWaiverBody,
  ): Promise<WaiverRecord> {
    const booking = await this.requireBooking(orgId, body.bookingId);
    if (booking.status !== 'confirmed' && booking.status !== 'pending_deposit') {
      throw new Error('booking not open for waiver');
    }
    const existing = await this.waivers.getByBooking(body.bookingId);
    if (existing) return existing;

    const row: WaiverRecord = {
      id: newId('wav'),
      orgId,
      bookingId: body.bookingId,
      signerName: body.signerName.trim(),
      signatureData: body.signatureData,
      signedAt: new Date().toISOString(),
    };
    await this.waivers.put(row);
    return row;
  }

  async scheduleCrew(
    orgId: string,
    body: CreateCrewShiftBody,
  ): Promise<CrewShiftRecord> {
    const row: CrewShiftRecord = {
      id: newId('shift'),
      orgId,
      boatId: body.boatId,
      userId: body.userId,
      date: body.date,
      role: body.role,
      createdAt: new Date().toISOString(),
    };
    await this.shifts.put(row);
    return row;
  }

  listCrewShifts(orgId: string, date?: string): Promise<CrewShiftRecord[]> {
    return this.shifts.list(orgId, date);
  }

  async cancel(
    orgId: string,
    bookingId: string,
    reason: string,
  ): Promise<BookingRecord> {
    const row = await this.requireBooking(orgId, bookingId);
    if (row.status === 'cancelled') return row;
    const next: BookingRecord = {
      ...row,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason.trim(),
    };
    await this.bookings.put(next);
    return next;
  }

  /**
   * Weather / ops rebook: cancel original, create confirmed sibling on new date.
   * Deposit carries — no second checkout.
   */
  async rebook(
    orgId: string,
    bookingId: string,
    input: { tripDate: string; boatId?: string },
  ): Promise<{ from: BookingRecord; to: BookingRecord }> {
    const from = await this.requireBooking(orgId, bookingId);
    if (from.status === 'cancelled' && from.rebookedToId) {
      throw new Error('booking already rebooked');
    }
    if (from.status !== 'confirmed' && from.status !== 'pending_deposit') {
      throw new Error('only open bookings can be rebooked');
    }

    const toId = newId('bk');
    const createdAt = new Date().toISOString();
    const to: BookingRecord = {
      id: toId,
      orgId,
      guestName: from.guestName,
      guestEmail: from.guestEmail,
      boatId: input.boatId ?? from.boatId,
      tripDate: input.tripDate,
      partySize: from.partySize,
      depositAmountCents: from.depositAmountCents,
      status: from.depositPaidAt ? 'confirmed' : 'pending_deposit',
      depositPaidAt: from.depositPaidAt,
      checkoutSessionId: from.checkoutSessionId,
      checkoutUrl: from.checkoutUrl,
      rebookedFromId: from.id,
      createdAt,
    };

    const cancelled: BookingRecord = {
      ...from,
      status: 'rebooked',
      cancelledAt: createdAt,
      cancelReason: 'rebooked',
      rebookedToId: toId,
    };

    await this.bookings.put(cancelled);
    await this.bookings.put(to);
    return { from: cancelled, to };
  }

  private async requireBooking(
    orgId: string,
    bookingId: string,
  ): Promise<BookingRecord> {
    const row = await this.bookings.get(orgId, bookingId);
    if (!row) throw new Error('booking not found');
    return row;
  }
}
