// workforce.module.ts
import { Module } from '@nestjs/common';
import { WorkforceController } from './workforce.controller';
import { WorkforceService } from './workforce.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WorkforceController],
  providers: [WorkforceService],
  exports: [WorkforceService],
})
export class WorkforceModule {}