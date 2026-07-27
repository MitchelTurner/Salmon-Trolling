import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { BillingModule } from '../billing/billing.module.js';
import { DerbiesController } from './derbies.controller.js';
import { DerbiesService } from './derbies.service.js';
import { MemoryDerbyStore } from './memory-store.js';
import { DERBY_STORE } from './types.js';

@Module({
  imports: [BillingModule],
  controllers: [DerbiesController],
  providers: [
    DerbiesService,
    OrgAuthGuard,
    {
      provide: DERBY_STORE,
      useFactory: () => new MemoryDerbyStore(),
    },
  ],
  exports: [DerbiesService, DERBY_STORE],
})
export class DerbiesModule {}
