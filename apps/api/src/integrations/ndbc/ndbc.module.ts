import { Module } from '@nestjs/common';
import { HttpNdbcClient } from './http-client.js';
import { NDBC_CLIENT } from './types.js';

@Module({
  providers: [
    {
      provide: NDBC_CLIENT,
      useFactory: () => new HttpNdbcClient(),
    },
  ],
  exports: [NDBC_CLIENT],
})
export class NdbcModule {}
