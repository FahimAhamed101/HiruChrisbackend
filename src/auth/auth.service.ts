import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  async signup(signupDto: SignupDto) {
    // Check if user exists by email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if user exists by phone number (if provided)
    if (signupDto.phoneNumber) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phoneNumber: signupDto.phoneNumber },
      });

      if (existingUserByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        phoneNumber: signupDto.phoneNumber,
        password: hashedPassword,
        fullName: signupDto.fullName,
        rememberMe: signupDto.rememberMe || false,
      },
    });

    // Generate and send OTP for verification
    await this.sendVerificationOtp(user);

    // Generate tokens (optional - depends on whether you want to login immediately)
    const tokens = await this.generateTokens(user.id);

    return {
      message: 'Account created successfully. Please verify your email/phone with OTP.',
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email OR phone number
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: loginDto.emailOrPhone }, // Try email
          { phoneNumber: loginDto.emailOrPhone }, // Try phone number
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Resend verification OTP
      await this.sendVerificationOtp(user);
      throw new UnauthorizedException(
        'Please verify your account first. Verification OTP has been resent.',
      );
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Update rememberMe if provided
    if (loginDto.rememberMe !== undefined) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { rememberMe: loginDto.rememberMe },
      });
    }

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async loginWithPhoneOnly(phoneNumber: string) {
    // Find user by phone number
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      // If user doesn't exist, you might want to:
      // 1. Create a new user automatically
      // 2. Or require registration first
      // 3. Or send OTP for phone verification first
      
      // For this example, we'll throw an error
      throw new UnauthorizedException('Phone number not registered. Please sign up first.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Send verification OTP
      await this.sendVerificationOtp(user);
      throw new UnauthorizedException(
        'Please verify your phone number first. Verification OTP has been sent.',
      );
    }

    // For phone-only login, generate and send OTP
    const otp = await this.otpService.generateOtp(
      user.id,
      'phone_login',
      5, // 5 minutes expiry
    );

    // Send OTP via SMS
    await this.smsService.sendLoginOtp(phoneNumber, otp.code);

    return {
      message: 'OTP sent to your phone number',
      userId: user.id,
      phoneNumber: user.phoneNumber,
    };
  }

  async verifyPhoneLoginOtp(phoneNumber: string, otpCode: string) {
    // Find user by phone number
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(
      user.id,
      otpCode,
      'phone_login',
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, phoneNumber, otpCode } = verifyOtpDto;

    // Find user by email or phone number
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phoneNumber: phoneNumber },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(
      user.id,
      otpCode,
      'verification',
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark user as verified
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    // Generate tokens after verification
    const tokens = await this.generateTokens(user.id);

    return {
      message: 'Account verified successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        fullName: updatedUser.fullName,
        isVerified: updatedUser.isVerified,
      },
      ...tokens,
    };
  }

  async resendOtp(email?: string, phoneNumber?: string) {
    if (!email && !phoneNumber) {
      throw new BadRequestException('Email or phone number is required');
    }

    // Find user by email or phone number
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phoneNumber: phoneNumber },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Send verification OTP
    await this.sendVerificationOtp(user);

    return {
      message: 'OTP has been resent successfully',
      deliveryMethod: user.email ? 'email' : 'sms',
    };
  }

  async forgotPassword(emailOrPhone: string) {
    // Find user by email OR phone number
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phoneNumber: emailOrPhone },
        ],
      },
    });

    if (!user) {
      // For security, don't reveal if user exists
      return {
        message: 'If an account exists, a password reset OTP has been sent.',
      };
    }

    // Generate password reset OTP
    const otp = await this.otpService.generateOtp(
      user.id,
      'password_reset',
      10, // 10 minutes expiry
    );

    // Send OTP via appropriate method
    if (user.email && user.email === emailOrPhone) {
      await this.emailService.sendPasswordResetOtp(user.email, otp.code);
      return {
        message: 'Password reset OTP has been sent to your email',
      };
    } else if (user.phoneNumber && user.phoneNumber === emailOrPhone) {
      await this.smsService.sendPasswordResetOtp(user.phoneNumber, otp.code);
      return {
        message: 'Password reset OTP has been sent to your phone',
      };
    }
  }

  async resetPassword(emailOrPhone: string, otpCode: string, newPassword: string) {
    // Find user by email OR phone number
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phoneNumber: emailOrPhone },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(
      user.id,
      otpCode,
      'password_reset',
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password has been reset successfully',
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || '123456',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return await this.generateTokens(user.id);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        fullName: true,
        isVerified: true,
        isActive: true,
      },
    });
  }

  private async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_ACCESS_SECRET || '12345',
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET || '123456',
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  private async sendVerificationOtp(user: any) {
    // Generate verification OTP
    const otp = await this.otpService.generateOtp(
      user.id,
      'verification',
      10, // 10 minutes expiry
    );

    // Send OTP via email
    if (user.email) {
      await this.emailService.sendVerificationOtp(user.email, otp.code);
    }

    // Send OTP via SMS if phone number exists
    if (user.phoneNumber) {
      await this.smsService.sendVerificationOtp(user.phoneNumber, otp.code);
    }
  }
}