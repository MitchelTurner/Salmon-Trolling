import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { FishTagsModule } from '../fish-tags/fish-tags.module.js';
import { GuestReportsModule } from '../guest-reports/guest-reports.module.js';
import { MemoryShippingStore } from './memory-store.js';
import { ShippingController } from './shipping.controller.js';
import { ShippingService } from './shipping.service.js';
import { SHIPPING_STORE } from './types.js';

@Module({
  imports: [FishTagsModule, GuestReportsModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    OrgAuthGuard,
    {
      provide: SHIPPING_STORE,
      useFactory: () => new MemoryShippingStore(),
    },
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
