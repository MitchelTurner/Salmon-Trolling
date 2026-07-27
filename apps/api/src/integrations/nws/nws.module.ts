import { Module } from '@nestjs/common';
import { HttpNwsClient } from './http-client.js';
import { NWS_CLIENT } from './types.js';

@Module({
  providers: [
    {
      provide: NWS_CLIENT,
      useFactory: () => new HttpNwsClient(),
    },
  ],
  exports: [NWS_CLIENT],
})
export class NwsModule {}
