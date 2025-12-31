import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { ResponseMessagesEnums } from '../common/enums/response-messages.enum';

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
    if (!signupDto.email && !signupDto.phoneNumber) {
      throw new BadRequestException(ResponseMessagesEnums.INVALID_DATA_PROVIDED);
    }

    // Check if user exists by email
    if (signupDto.email) {
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email: signupDto.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException(ResponseMessagesEnums.ALREADY_EXIST);
      }
    }

    // Check if user exists by phone number (if provided)
    if (signupDto.phoneNumber) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phoneNumber: signupDto.phoneNumber },
      });

      if (existingUserByPhone) {
        throw new ConflictException(ResponseMessagesEnums.ALREADY_EXIST);
      }
    }

    // Hash password (generate a random one if omitted for phone-only signup)
    const rawPassword = signupDto.password || randomBytes(24).toString('hex');
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email || null,
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

    const roleSnapshot = await this.getUserRoleSnapshot(user.id);

    return {
      message: ResponseMessagesEnums.SUCCESS,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        isVerified: user.isVerified,
        role: roleSnapshot.role,
        businessId: roleSnapshot.businessId,
        businessName: roleSnapshot.businessName,
        roles: roleSnapshot.roles,
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
      throw new UnauthorizedException(ResponseMessagesEnums.NOT_AUTHENTICATED);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ResponseMessagesEnums.NOT_AUTHENTICATED);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(ResponseMessagesEnums.NOT_AUTHENTICATED);
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Resend verification OTP
      await this.sendVerificationOtp(user);
      throw new UnauthorizedException(ResponseMessagesEnums.NOT_AUTHENTICATED);
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

    const roleSnapshot = await this.getUserRoleSnapshot(user.id);

    return {
      message: ResponseMessagesEnums.SUCCESS,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        isVerified: user.isVerified,
        role: roleSnapshot.role,
        businessId: roleSnapshot.businessId,
        businessName: roleSnapshot.businessName,
        roles: roleSnapshot.roles,
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
      throw new UnauthorizedException(ResponseMessagesEnums.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ResponseMessagesEnums.NOT_AUTHENTICATED);
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Send verification OTP
      await this.sendVerificationOtp(user);
      throw new UnauthorizedException(ResponseMessagesEnums.NOT_AUTHENTICATED);
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
      message: ResponseMessagesEnums.SUCCESS,
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
      throw new NotFoundException(ResponseMessagesEnums.USER_NOT_FOUND);
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(
      user.id,
      otpCode,
      'phone_login',
    );

    if (!isValid) {
      throw new BadRequestException(ResponseMessagesEnums.INVALID_DATA_PROVIDED);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    const roleSnapshot = await this.getUserRoleSnapshot(user.id);

    return {
      message: ResponseMessagesEnums.SUCCESS,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        isVerified: user.isVerified,
        role: roleSnapshot.role,
        businessId: roleSnapshot.businessId,
        businessName: roleSnapshot.businessName,
        roles: roleSnapshot.roles,
      },
      ...tokens,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { emailOrPhone, email, phoneNumber, otpCode } = verifyOtpDto;
    const resolvedEmail =
      emailOrPhone && emailOrPhone.includes('@') ? emailOrPhone : email;
    const resolvedPhone =
      emailOrPhone && !emailOrPhone.includes('@')
        ? emailOrPhone
        : phoneNumber;

    if (!resolvedEmail && !resolvedPhone) {
      throw new BadRequestException(ResponseMessagesEnums.INVALID_DATA_PROVIDED);
    }

    // Find user by email or phone number
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: resolvedEmail },
          { phoneNumber: resolvedPhone },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException(ResponseMessagesEnums.USER_NOT_FOUND);
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(
      user.id,
      otpCode,
      'verification',
    );

    if (!isValid) {
      throw new BadRequestException(ResponseMessagesEnums.INVALID_DATA_PROVIDED);
    }

    // Mark user as verified
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    // Generate tokens after verification
    const tokens = await this.generateTokens(user.id);

    const roleSnapshot = await this.getUserRoleSnapshot(updatedUser.id);

    return {
      message: ResponseMessagesEnums.SUCCESS,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        fullName: updatedUser.fullName,
        isVerified: updatedUser.isVerified,
        role: roleSnapshot.role,
        businessId: roleSnapshot.businessId,
        businessName: roleSnapshot.businessName,
        roles: roleSnapshot.roles,
      },
      ...tokens,
    };
  }

  async resendOtp(email?: string, phoneNumber?: string) {
    if (!email && !phoneNumber) {
      throw new BadRequestException(ResponseMessagesEnums.INVALID_DATA_PROVIDED);
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
      throw new NotFoundException(ResponseMessagesEnums.USER_NOT_FOUND);
    }

    // Send verification OTP
    await this.sendVerificationOtp(user);

    return {
      message: ResponseMessagesEnums.SUCCESS,
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
        message: ResponseMessagesEnums.SUCCESS,
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
        message: ResponseMessagesEnums.SUCCESS,
      };
    } else if (user.phoneNumber && user.phoneNumber === emailOrPhone) {
      await this.smsService.sendPasswordResetOtp(user.phoneNumber, otp.code);
      return {
        message: ResponseMessagesEnums.SUCCESS,
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
      throw new NotFoundException(ResponseMessagesEnums.USER_NOT_FOUND);
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(
      user.id,
      otpCode,
      'password_reset',
    );

    if (!isValid) {
      throw new BadRequestException(ResponseMessagesEnums.INVALID_DATA_PROVIDED);
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      message: ResponseMessagesEnums.SUCCESS,
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
        throw new UnauthorizedException(ResponseMessagesEnums.USER_NOT_FOUND);
      }

      return await this.generateTokens(user.id);
    } catch (error) {
      throw new UnauthorizedException(ResponseMessagesEnums.NOT_AUTHENTICATED);
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

  private async getUserRoleSnapshot(userId: string) {
    const userBusinesses = await this.prisma.userBusiness.findMany({
      where: { userId },
      include: {
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const selected =
      userBusinesses.find(entry => entry.isSelected) || userBusinesses[0];

    if (userBusinesses.length === 0) {
      return {
        role: 'employee',
        businessId: null,
        businessName: null,
        roles: [],
      };
    }

    return {
      role: selected?.role ?? 'employee',
      businessId: selected?.businessId ?? null,
      businessName: selected?.business?.name ?? null,
      roles: userBusinesses.map(entry => ({
        businessId: entry.businessId,
        businessName: entry.business?.name ?? null,
        role: entry.role ?? null,
        isSelected: entry.isSelected,
      })),
    };
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
