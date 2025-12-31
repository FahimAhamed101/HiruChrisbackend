import { IsEmail, IsString, IsOptional, IsBoolean, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number in E.164 format', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phoneNumber?: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;

  @ApiProperty({ example: true, description: 'Remember me option', required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
