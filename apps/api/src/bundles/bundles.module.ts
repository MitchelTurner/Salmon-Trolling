import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { BUNDLE_CACHE, MemoryBundleCache } from './cache.js';
import { BundlesController } from './bundles.controller.js';
import {
  BUNDLE_DATA_SOURCE,
  BundlesService,
  createDefaultBundleDataSource,
} from './bundles.service.js';

@Module({
  controllers: [BundlesController],
  providers: [
    BundlesService,
    OrgAuthGuard,
    {
      provide: BUNDLE_CACHE,
      useFactory: () => new MemoryBundleCache(),
    },
    {
      provide: BUNDLE_DATA_SOURCE,
      useFactory: () => createDefaultBundleDataSource(),
    },
  ],
  exports: [BundlesService, BUNDLE_CACHE],
})
export class BundlesModule {}
