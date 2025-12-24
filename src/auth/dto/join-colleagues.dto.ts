// dto/join-colleagues.dto.ts
import { IsString, IsNotEmpty, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanQRDto {
  @ApiProperty({ 
    example: 'QR_CODE_DATA_HERE', 
    description: 'QR code data scanned from another user' 
  })
  @IsString()
  @IsNotEmpty()
  qrData: string;
}

export class EnterCodeDto {
  @ApiProperty({ 
    example: 'ABC123', 
    description: '6-character colleague code' 
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 characters' })
  @Matches(/^[A-Z0-9]{6}$/, { 
    message: 'Code must contain only uppercase letters and numbers' 
  })
  code: string;
}

export class GenerateColleagueCodeDto {
  @ApiProperty({ 
    example: 'business-id', 
    description: 'Business ID to generate code for',
    required: false 
  })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({ 
    example: 30, 
    description: 'Code expiry time in minutes (default: 30)',
    required: false 
  })
  @IsOptional()
  expiryMinutes?: number;
}

// dto/job-search.dto.ts
export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
}

export enum JobCategory {
  HOSPITALITY = 'hospitality',
  RETAIL = 'retail',
  FOOD_SERVICE = 'food_service',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  TECHNOLOGY = 'technology',
  OTHER = 'other',
}

export class SearchJobsDto {
  @ApiProperty({ 
    example: 'hotel manager', 
    description: 'Search query',
    required: false 
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ 
    example: 'New York', 
    description: 'Location',
    required: false 
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ 
    enum: JobCategory, 
    description: 'Job category',
    required: false 
  })
  @IsOptional()
  category?: JobCategory;

  @ApiProperty({ 
    enum: JobType, 
    description: 'Job type',
    required: false 
  })
  @IsOptional()
  jobType?: JobType;

  @ApiProperty({ 
    example: 15, 
    description: 'Minimum hourly rate',
    required: false 
  })
  @IsOptional()
  minRate?: number;

  @ApiProperty({ 
    example: 25, 
    description: 'Maximum hourly rate',
    required: false 
  })
  @IsOptional()
  maxRate?: number;

  @ApiProperty({ 
    example: 1, 
    description: 'Page number',
    required: false 
  })
  @IsOptional()
  page?: number;

  @ApiProperty({ 
    example: 20, 
    description: 'Items per page',
    required: false 
  })
  @IsOptional()
  limit?: number;
}

export class CreateJobListingDto {
  @ApiProperty({ example: 'Hotel Manager', description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'business-id', description: 'Business posting the job' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ 
    example: 'Manage daily operations of a luxury hotel', 
    description: 'Job description' 
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'New York, NY', description: 'Job location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ 
    enum: JobType, 
    example: 'full_time',
    description: 'Job type' 
  })
  jobType: JobType;

  @ApiProperty({ 
    enum: JobCategory, 
    example: 'hospitality',
    description: 'Job category' 
  })
  category: JobCategory;

  @ApiProperty({ example: 20, description: 'Hourly rate', required: false })
  @IsOptional()
  hourlyRate?: number;

  @ApiProperty({ 
    example: ['Management experience', 'Customer service'], 
    description: 'Required skills',
    required: false 
  })
  @IsOptional()
  requiredSkills?: string[];

  @ApiProperty({ 
    example: '2024-12-31', 
    description: 'Application deadline',
    required: false 
  })
  @IsOptional()
  deadline?: string;
}

export class ApplyToJobDto {
  @ApiProperty({ example: 'job-listing-id', description: 'Job listing ID' })
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty({ 
    example: 'I am very interested in this position...', 
    description: 'Cover letter',
    required: false 
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiProperty({ 
    example: '/uploads/resumes/resume.pdf', 
    description: 'Resume file path',
    required: false 
  })
  @IsOptional()
  @IsString()
  resumePath?: string;
}