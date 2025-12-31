// src/auth/dto/leave-holiday.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ==================== LEAVE REQUEST DTOs ====================

export enum LeaveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum LeaveRequestType {
  HOURLY_LEAVE = 'hourly_leave',
  SICK_LEAVE = 'sick_leave',
  CASUAL_LEAVE = 'casual_leave',
  EARNED_LEAVE = 'earned_leave',
  UNPAID_LEAVE = 'unpaid_leave',
}

export class GetLeaveRequestsDto {
  @ApiProperty({ 
    enum: LeaveRequestStatus, 
    example: 'pending',
    description: 'Filter by status',
    required: false 
  })
  @IsOptional()
  @IsEnum(LeaveRequestStatus)
  status?: LeaveRequestStatus;

  @ApiProperty({ 
    example: 'business-id',
    description: 'Business ID',
    required: false 
  })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({ 
    example: '2025-04-21',
    description: 'Filter by date (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ApproveLeaveRequestDto {
  @ApiProperty({ 
    example: 'leave-request-id',
    description: 'Leave request ID' 
  })
  @IsString()
  @IsNotEmpty()
  leaveRequestId: string;

  @ApiProperty({ 
    example: true,
    description: 'Approve or reject' 
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ 
    example: 'Approved - take care',
    description: 'Optional notes',
    required: false 
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectLeaveRequestDto {
  @ApiProperty({ 
    example: 'leave-request-id',
    description: 'Leave request ID' 
  })
  @IsString()
  @IsNotEmpty()
  leaveRequestId: string;

  @ApiProperty({ 
    enum: [
      'too_many_employees_on_leave',
      'business_priority_day',
      'insufficient_notice',
      'other'
    ],
    example: 'too_many_employees_on_leave',
    description: 'Rejection reason category' 
  })
  @IsString()
  @IsNotEmpty()
  rejectionCategory: string;

  @ApiProperty({ 
    example: 'We already have 3 employees on leave that day',
    description: 'Detailed rejection reason' 
  })
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

export class CreateLeaveRequestDto {
  @ApiProperty({ 
    example: '2025-04-21',
    description: 'Start date (YYYY-MM-DD)' 
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({ 
    example: '2025-04-23',
    description: 'End date (YYYY-MM-DD)' 
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({ 
    enum: LeaveRequestType,
    example: 'sick_leave',
    description: 'Type of leave' 
  })
  @IsEnum(LeaveRequestType)
  type: LeaveRequestType;

  @ApiProperty({ 
    example: 'Fever And Body Ache Medical Checkup And Recovery At Home',
    description: 'Reason for leave' 
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ 
    example: 'business-id',
    description: 'Business ID' 
  })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ 
    example: false,
    description: 'Half day leave',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @ApiProperty({ 
    example: '09:00',
    description: 'Start time for half day (HH:mm)',
    required: false 
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ 
    example: '13:00',
    description: 'End time for half day (HH:mm)',
    required: false 
  })
  @IsOptional()
  @IsString()
  endTime?: string;
}

// ==================== HOLIDAY DTOs ====================

export enum HolidayType {
  NATIONAL = 'national',
  FEDERAL = 'federal',
  RELIGIOUS = 'religious',
  COMPANY = 'company',
  OTHER = 'other',
}

export enum HolidayAppliesTo {
  ALL_EMPLOYEES = 'all_employees',
  SPECIFIC_ROLES = 'specific_roles',
  SPECIFIC_DEPARTMENTS = 'specific_departments',
}

export class CreateHolidayDto {
  @ApiProperty({ 
    example: 'Independence Day',
    description: 'Holiday title' 
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ 
    example: '2025-07-04',
    description: 'Holiday date (YYYY-MM-DD)' 
  })
  @IsDateString()
  date: string;

  @ApiProperty({ 
    enum: HolidayType,
    example: 'national',
    description: 'Holiday type' 
  })
  @IsEnum(HolidayType)
  type: HolidayType;

  @ApiProperty({ 
    enum: HolidayAppliesTo,
    example: 'all_employees',
    description: 'Who this holiday applies to' 
  })
  @IsEnum(HolidayAppliesTo)
  appliesTo: HolidayAppliesTo;

  @ApiProperty({ 
    example: 'business-id',
    description: 'Business ID',
    required: false 
  })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({ 
    example: 'National Independence Day celebration',
    description: 'Holiday description',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class GetHolidaysDto {
  @ApiProperty({ 
    example: 'business-id',
    description: 'Business ID',
    required: false 
  })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({ 
    example: '2025-03',
    description: 'Month in YYYY-MM format',
    required: false 
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({ 
    example: '2025',
    description: 'Year',
    required: false 
  })
  @IsOptional()
  @IsString()
  year?: string;
}

export class UpdateHolidayDto {
  @ApiProperty({ 
    example: 'Independence Day & Announcement',
    description: 'Holiday title',
    required: false 
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ 
    example: '2025-07-04',
    description: 'Holiday date (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ 
    enum: HolidayType,
    required: false 
  })
  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType;

  @ApiProperty({ 
    enum: HolidayAppliesTo,
    required: false 
  })
  @IsOptional()
  @IsEnum(HolidayAppliesTo)
  appliesTo?: HolidayAppliesTo;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ImportHolidaysDto {
  @ApiProperty({ 
    example: 'US',
    description: 'Country code' 
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ 
    example: '2025',
    description: 'Year to import holidays for' 
  })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiProperty({ 
    example: 'business-id',
    description: 'Business ID',
    required: false 
  })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({ 
    example: ['national', 'federal'],
    description: 'Types of holidays to import',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];
}

export class DeleteHolidayDto {
  @ApiProperty({ 
    example: 'holiday-id',
    description: 'Holiday ID to delete' 
  })
  @IsString()
  @IsNotEmpty()
  holidayId: string;
}

// ==================== CALENDAR DTOs ====================

export class GetCalendarDto {
  @ApiProperty({ 
    example: '2025-03',
    description: 'Month in YYYY-MM format' 
  })
  @IsString()
  @IsNotEmpty()
  month: string;

  @ApiProperty({ 
    example: 'business-id',
    description: 'Business ID',
    required: false 
  })
  @IsOptional()
  @IsString()
  businessId?: string;
}