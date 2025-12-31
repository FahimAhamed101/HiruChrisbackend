// src/auth/leave-holiday.module.ts
import { Module } from '@nestjs/common';
import { LeaveHolidayController } from './leave-holiday.controller';
import { LeaveHolidayService } from './leave-holiday.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LeaveHolidayController],
  providers: [LeaveHolidayService],
  exports: [LeaveHolidayService],
})
export class LeaveHolidayModule {}