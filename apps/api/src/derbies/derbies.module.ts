import { Module } from '@nestjs/common';
import { DerbiesController } from './derbies.controller.js';
import { DerbiesService } from './derbies.service.js';
import { MemoryDerbyStore } from './memory-store.js';
import { DERBY_STORE } from './types.js';

@Module({
  controllers: [DerbiesController],
  providers: [
    DerbiesService,
    {
      provide: DERBY_STORE,
      useFactory: () => new MemoryDerbyStore(),
    },
  ],
  exports: [DerbiesService, DERBY_STORE],
})
export class DerbiesModule {}
