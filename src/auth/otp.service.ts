import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  async generateOtp(userId: string, type: string, expiresInMinutes: number = 10) {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    // Invalidate previous unused OTPs of same type
    await this.prisma.oTP.updateMany({
      where: {
        userId,
        type,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Create new OTP
    const otp = await this.prisma.oTP.create({
      data: {
        code,
        type,
        expiresAt,
        userId,
      },
    });

    return otp;
  }

  async verifyOtp(userId: string, code: string, type: string) {
    const otp = await this.prisma.oTP.findFirst({
      where: {
        userId,
        code,
        type,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      return false;
    }

    // Mark OTP as used
    await this.prisma.oTP.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    return true;
  }

  async cleanupExpiredOtps() {
    // Clean up expired OTPs (run as a cron job)
    await this.prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}