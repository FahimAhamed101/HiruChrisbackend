// leave-tracking.module.ts
import { Module } from '@nestjs/common';
import { LeaveTrackingController } from './leave-tracking.controller';
import { LeaveTrackingService } from './leave-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LeaveTrackingController],
  providers: [LeaveTrackingService],
  exports: [LeaveTrackingService],
})
export class LeaveTrackingModule {}