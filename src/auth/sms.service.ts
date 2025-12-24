import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  sendLoginOtp(phoneNumber: string, code: string) {
    throw new Error('Method not implemented.');
  }
  sendPasswordResetOtp(phoneNumber: string, code: string) {
    throw new Error('Method not implemented.');
  }
  async sendVerificationOtp(phoneNumber: string, otp: string) {
    // TODO: Implement actual SMS service (Twilio, etc.)
    console.log(`Verification OTP for ${phoneNumber}: ${otp}`);
  }
}