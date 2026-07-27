import { describe, expect, it } from 'vitest';
import { FakeStripeGateway } from '../billing/fake-stripe.js';
import { BookingsService } from './bookings.service.js';
import {
  MemoryBookingStore,
  MemoryCrewShiftStore,
  MemoryWaiverStore,
} from './memory-store.js';

describe('BookingsService', () => {
  function setup() {
    const stripe = new FakeStripeGateway();
    const service = new BookingsService(
      new MemoryBookingStore(),
      new MemoryWaiverStore(),
      new MemoryCrewShiftStore(),
      stripe,
    );
    return { service, stripe };
  }

  const baseBooking = {
    guestName: 'Alex Guest',
    guestEmail: 'alex@example.com',
    boatId: 'boat_1',
    tripDate: '2026-08-01',
    partySize: 4,
    depositAmountCents: 25_000,
    successUrl: 'https://troll.app/ok',
    cancelUrl: 'https://troll.app/no',
  };

  it('creates a booking with Stripe deposit checkout', async () => {
    const { service, stripe } = setup();
    const booking = await service.create('org_1', baseBooking);
    expect(booking.status).toBe('pending_deposit');
    expect(booking.checkoutUrl).toContain('checkout.stripe.test');
    expect(stripe.sessions[0]?.mode).toBe('payment');
  });

  it('confirms deposit, captures waiver, schedules crew, and rebooks', async () => {
    const { service } = setup();
    const booking = await service.create('org_1', baseBooking);
    const paid = await service.confirmDeposit('org_1', booking.id);
    expect(paid.status).toBe('confirmed');

    const waiver = await service.signWaiver('org_1', {
      bookingId: booking.id,
      signerName: 'Alex Guest',
      signatureData: 'data:image/png;base64,aaa',
    });
    expect(waiver.signerName).toBe('Alex Guest');

    const shift = await service.scheduleCrew('org_1', {
      boatId: 'boat_1',
      userId: 'user_crew',
      date: '2026-08-01',
      role: 'CREW',
    });
    expect(shift.role).toBe('CREW');

    const { from, to } = await service.rebook('org_1', booking.id, {
      tripDate: '2026-08-03',
    });
    expect(from.status).toBe('rebooked');
    expect(to.tripDate).toBe('2026-08-03');
    expect(to.status).toBe('confirmed');
    expect(to.rebookedFromId).toBe(from.id);
  });

  it('cancels with a reason', async () => {
    const { service } = setup();
    const booking = await service.create('org_1', baseBooking);
    const cancelled = await service.cancel(
      'org_1',
      booking.id,
      'weather window closed',
    );
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelReason).toContain('weather');
  });
});
