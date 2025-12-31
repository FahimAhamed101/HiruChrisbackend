import { IsString, IsOptional, Length, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address or phone number in E.164 format',
    required: false,
  })
  @IsOptional()
  @IsString()
  emailOrPhone?: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phoneNumber?: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otpCode: string;
}
