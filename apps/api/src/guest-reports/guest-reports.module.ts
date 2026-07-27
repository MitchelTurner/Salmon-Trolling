import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import {
  FakeEmailGateway,
  MemoryGuestReportStore,
  MemoryTripCatchSource,
} from './memory-store.js';
import { GuestReportsController } from './guest-reports.controller.js';
import { GuestReportsService } from './guest-reports.service.js';
import {
  EMAIL_GATEWAY,
  GUEST_REPORT_STORE,
  TRIP_CATCH_SOURCE,
} from './types.js';

@Module({
  controllers: [GuestReportsController],
  providers: [
    GuestReportsService,
    OrgAuthGuard,
    {
      provide: GUEST_REPORT_STORE,
      useFactory: () => new MemoryGuestReportStore(),
    },
    {
      provide: TRIP_CATCH_SOURCE,
      useFactory: () => new MemoryTripCatchSource(),
    },
    {
      provide: EMAIL_GATEWAY,
      useFactory: () => new FakeEmailGateway(),
    },
  ],
  exports: [GuestReportsService, TRIP_CATCH_SOURCE, EMAIL_GATEWAY],
})
export class GuestReportsModule {}
