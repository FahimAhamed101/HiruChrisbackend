import { IsEmail, IsString, MinLength, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otpCode: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}