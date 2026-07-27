import { Module } from '@nestjs/common';
import { HttpCoopsClient } from './http-client.js';
import { COOPS_CLIENT } from './types.js';

@Module({
  providers: [
    {
      provide: COOPS_CLIENT,
      useFactory: () => new HttpCoopsClient(),
    },
  ],
  exports: [COOPS_CLIENT],
})
export class CoopsModule {}
