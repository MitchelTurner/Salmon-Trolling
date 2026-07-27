import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { FishTagsController } from './fish-tags.controller.js';
import { FishTagsService } from './fish-tags.service.js';
import { MemoryCatchLookup, MemoryFishTagStore } from './memory-store.js';
import { CATCH_LOOKUP, FISH_TAG_STORE } from './types.js';

@Module({
  controllers: [FishTagsController],
  providers: [
    FishTagsService,
    OrgAuthGuard,
    {
      provide: FISH_TAG_STORE,
      useFactory: () => new MemoryFishTagStore(),
    },
    {
      provide: CATCH_LOOKUP,
      useFactory: () => new MemoryCatchLookup(),
    },
  ],
  exports: [FishTagsService, CATCH_LOOKUP],
})
export class FishTagsModule {}
