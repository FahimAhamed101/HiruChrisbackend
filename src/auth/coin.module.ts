// coin.module.ts
import { Module } from '@nestjs/common';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CoinController],
  providers: [CoinService],
  exports: [CoinService],
})
export class CoinModule {}