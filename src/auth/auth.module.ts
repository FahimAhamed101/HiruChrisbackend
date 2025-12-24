import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || '12345',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    OtpService,
    EmailService,
    SmsService,
  ],
  exports: [AuthService],
})
export class AuthModule {}