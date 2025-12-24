// dto/update-profile.dto.ts
import { IsString, IsOptional, IsDateString, IsEnum, IsUrl, IsArray, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export class LocationDto {
  @ApiProperty({ example: 'Central Park', description: 'Location name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Central Park, New York, NY', description: 'Full address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 40.785091, description: 'Latitude', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: -73.968285, description: 'Longitude', required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class SocialMediaDto {
  @ApiProperty({ example: 'Facebook', description: 'Social media platform name' })
  @IsString()
  platform: string;

  @ApiProperty({ example: '@abc_f', description: 'Username or handle', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'in/albert-forc12562f25', description: 'Profile ID or handle', required: false })
  @IsOptional()
  @IsString()
  profileId?: string;

  @ApiProperty({ example: '+1(23) 256 25612', description: 'Phone number for WhatsApp', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 'https://facebook.com/user', description: 'Profile URL', required: false })
  @IsOptional()
  @IsUrl()
  url?: string;
    profileHandle: null;
}

export class CompanyDto {
  @ApiProperty({ example: 'Ferozi Beach Club', description: 'Company name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2020-01-01', description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2023-12-31', description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Job title', required: false })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty({ example: true, description: 'Is currently working here', required: false })
  @IsOptional()
  isCurrentlyWorking?: boolean;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'Location details', required: false, type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({ example: '1990-01-01', description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ enum: Gender, description: 'Gender', required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ example: 'Software developer passionate about building great products', description: 'Personal intro/bio', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ description: 'Social media accounts', required: false, type: [SocialMediaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaDto)
  socialMedia?: SocialMediaDto[];

  @ApiProperty({ description: 'Company/employer information', required: false, type: [CompanyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyDto)
  companies?: CompanyDto[];

  @ApiProperty({ example: ['Art', 'Photography', 'Music', 'Social Media'], description: 'User interests', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiProperty({ example: 80, description: 'Profile completion percentage', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  profileProgress?: number;
}

export class UploadPhotoDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Profile photo file' })
  photo: any;
}

export class AddCompanyManuallyDto {
  @ApiProperty({ example: 'My Company', description: 'Company name to add manually' })
  @IsString()
  companyName: string;
}