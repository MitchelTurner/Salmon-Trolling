import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { BillingModule } from './billing/billing.module.js';
import { BundlesModule } from './bundles/bundles.module.js';
import { CalcModule } from './calc/calc.module.js';
import { ProblemFilter } from './calc/problem.filter.js';
import { FishTagsModule } from './fish-tags/fish-tags.module.js';
import { GuestReportsModule } from './guest-reports/guest-reports.module.js';
import { OrgModule } from './org/org.module.js';
import { ProcessingModule } from './processing/processing.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { ShippingModule } from './shipping/shipping.module.js';
import { SyncModule } from './sync/sync.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    CalcModule,
    SyncModule,
    BundlesModule,
    BillingModule,
    RecommendationsModule,
    OrgModule,
    GuestReportsModule,
    FishTagsModule,
    ProcessingModule,
    ShippingModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: ProblemFilter,
    },
  ],
})
export class AppModule {}
