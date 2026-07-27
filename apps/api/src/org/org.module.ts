import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import {
  MemoryOrgBoatStore,
  MemoryOrgCrewStore,
} from './memory-store.js';
import { OrgController } from './org.controller.js';
import { OrgService } from './org.service.js';
import { ORG_BOAT_STORE, ORG_CREW_STORE } from './types.js';

@Module({
  controllers: [OrgController],
  providers: [
    OrgService,
    OrgAuthGuard,
    {
      provide: ORG_BOAT_STORE,
      useFactory: () => new MemoryOrgBoatStore(),
    },
    {
      provide: ORG_CREW_STORE,
      useFactory: () => new MemoryOrgCrewStore(),
    },
  ],
  exports: [OrgService],
})
export class OrgModule {}
