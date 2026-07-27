import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { SyncController } from './sync.controller.js';
import { SYNC_STORE, SyncService } from './sync.service.js';
import { MemorySyncStore } from './sync.store.js';

@Module({
  controllers: [SyncController],
  providers: [
    SyncService,
    OrgAuthGuard,
    {
      provide: SYNC_STORE,
      useFactory: () => new MemorySyncStore(),
    },
  ],
  exports: [SyncService, SYNC_STORE],
})
export class SyncModule {}
