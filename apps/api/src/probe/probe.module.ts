import { Module } from '@nestjs/common';
import { OrgAuthGuard } from '../auth/org-auth.guard.js';
import { ProbeController } from './probe.controller.js';

@Module({
  controllers: [ProbeController],
  providers: [OrgAuthGuard],
})
export class ProbeModule {}
