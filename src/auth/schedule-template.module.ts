// src/auth/schedule-template.module.ts
import { Module } from '@nestjs/common';
import { ScheduleTemplateController } from './schedule-template.controller';
import { ScheduleTemplateService } from './schedule-template.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ScheduleTemplateController],
  providers: [ScheduleTemplateService],
  exports: [ScheduleTemplateService],
})
export class ScheduleTemplateModule {}