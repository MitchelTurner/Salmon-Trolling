import { Module } from '@nestjs/common';
import { HttpAdfgClient } from './http-client.js';
import { ADFG_CLIENT } from './types.js';

@Module({
  providers: [
    {
      provide: ADFG_CLIENT,
      useFactory: () => new HttpAdfgClient(),
    },
  ],
  exports: [ADFG_CLIENT],
})
export class AdfgModule {}
