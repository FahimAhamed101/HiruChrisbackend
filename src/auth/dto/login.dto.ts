import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email or phone number',
    example: 'user@example.com or +1234567890',
  })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({
    description: 'Password (not required for phone-only login)',
    example: 'password123',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Remember me',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}