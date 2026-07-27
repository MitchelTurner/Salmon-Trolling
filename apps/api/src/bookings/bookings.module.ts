import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { BillingModule } from '../billing/billing.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import {
  MemoryBookingStore,
  MemoryCrewShiftStore,
  MemoryWaiverStore,
} from './memory-store.js';
import {
  BOOKING_STORE,
  CREW_SHIFT_STORE,
  WAIVER_STORE,
} from './types.js';

@Module({
  imports: [BillingModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    OrgAuthGuard,
    {
      provide: BOOKING_STORE,
      useFactory: () => new MemoryBookingStore(),
    },
    {
      provide: WAIVER_STORE,
      useFactory: () => new MemoryWaiverStore(),
    },
    {
      provide: CREW_SHIFT_STORE,
      useFactory: () => new MemoryCrewShiftStore(),
    },
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
