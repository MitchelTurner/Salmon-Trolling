import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { CalibrationController } from './calibration.controller.js';
import {
  CALIBRATION_FIT_STORE,
  CalibrationService,
} from './calibration.service.js';
import { MemoryCalibrationFitStore } from './calibration.store.js';

@Module({
  controllers: [CalibrationController],
  providers: [
    CalibrationService,
    OrgAuthGuard,
    {
      provide: CALIBRATION_FIT_STORE,
      useFactory: () => new MemoryCalibrationFitStore(),
    },
  ],
  exports: [CalibrationService],
})
export class CalibrationModule {}
