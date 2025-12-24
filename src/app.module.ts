// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module'; // Add this
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './auth/profile.module';
import { WorkforceModule } from './auth/workforce.module';
import { StaticController } from './static/static.controller';
import { ColleaguesJobModule } from './auth/colleagues-job.module';
import { CoinModule } from './auth/coin.module';
import { ScheduleModule } from './auth/schedule.module';
@Module({
  imports: [
    PrismaModule, ProfileModule, WorkforceModule,ColleaguesJobModule,CoinModule,ScheduleModule,
    AuthModule,  ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController, StaticController],
  providers: [AppService],
})
export class AppModule {}