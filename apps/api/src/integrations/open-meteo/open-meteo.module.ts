import { Module } from '@nestjs/common';
import { HttpOpenMeteoClient } from './http-client.js';
import { OPEN_METEO_CLIENT } from './types.js';

@Module({
  providers: [
    {
      provide: OPEN_METEO_CLIENT,
      useFactory: () => new HttpOpenMeteoClient(),
    },
  ],
  exports: [OPEN_METEO_CLIENT],
})
export class OpenMeteoModule {}
