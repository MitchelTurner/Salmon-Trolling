import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { FishTagsModule } from '../fish-tags/fish-tags.module.js';
import { MemoryManifestStore } from './memory-store.js';
import { ProcessingController } from './processing.controller.js';
import { ProcessingService } from './processing.service.js';
import { MANIFEST_STORE } from './types.js';

@Module({
  imports: [FishTagsModule],
  controllers: [ProcessingController],
  providers: [
    ProcessingService,
    OrgAuthGuard,
    {
      provide: MANIFEST_STORE,
      useFactory: () => new MemoryManifestStore(),
    },
  ],
  exports: [ProcessingService],
})
export class ProcessingModule {}
