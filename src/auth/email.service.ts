import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendVerificationOtp(email: string, otp: string) {
    // TODO: Implement actual email sending service
    // For now, log to console
    console.log(`Verification OTP for ${email}: ${otp}`);
    
    // Example with nodemailer:
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({
    //   from: 'noreply@yourdomain.com',
    //   to: email,
    //   subject: 'Verify Your Account',
    //   html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
    // });
  }

  async sendPasswordResetOtp(email: string, otp: string) {
    // TODO: Implement actual email sending service
    console.log(`Password reset OTP for ${email}: ${otp}`);
  }
}