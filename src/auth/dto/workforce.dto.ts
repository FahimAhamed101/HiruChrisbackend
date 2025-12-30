// dto/business.dto.ts
import { IsString, IsOptional, IsBoolean, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BusinessType {
  HOTEL = 'hotel',
  RESTAURANT = 'restaurant',
  BAR = 'bar',
  RETAIL = 'retail',
  OTHER = 'other',
}

export class CreateBusinessDto {
  @ApiProperty({ example: 'Paradise Holiday', description: 'Business name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'hotel', enum: BusinessType, description: 'Business type' })
  @IsEnum(BusinessType)
  type: BusinessType;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiProperty({ example: '+1 212 345 6087', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '123 Main St, New York', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Luxury hotel in Manhattan', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '{"name":"Central Park","address":"Central Park, New York, NY","latitude":40.785091,"longitude":-73.968285}',
    required: false,
    description: 'Location JSON string',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    example: '[{"platform":"Facebook","username":"@abc_f","url":"https://facebook.com/user"}]',
    required: false,
    description: 'Social media JSON array string',
  })
  @IsOptional()
  @IsString()
  socialMedia?: string;
}

export class SelectBusinessDto {
  @ApiProperty({ example: ['business-id-1', 'business-id-2'], description: 'Array of business IDs to select' })
  @IsString({ each: true })
  businessIds: string[];
}

// dto/shift.dto.ts
export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateShiftDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;

  @ApiProperty({ example: 'Hotel & Bar Management', description: 'Shift title' })
  @IsString()
  title: string;

  @ApiProperty({ example: '2024-07-26T18:00:00Z', description: 'Shift start time' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '2024-07-27T02:00:00Z', description: 'Shift end time' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: '126 Avenue Street, Manhattan, New York', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 15.00, required: false, description: 'Hourly rate' })
  @IsOptional()
  hourlyRate?: number;

  @ApiProperty({ example: 'Additional shift notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClockInDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift ID' })
  @IsString()
  shiftId: string;

  @ApiProperty({ example: '2024-07-26T18:05:23Z', description: 'Clock in time' })
  @IsString()
  clockInTime: string;

  @ApiProperty({ example: { latitude: 40.7128, longitude: -74.0060 }, required: false })
  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
  };
}

export class ClockOutDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift ID' })
  @IsString()
  shiftId: string;

  @ApiProperty({ example: '2024-07-27T02:15:45Z', description: 'Clock out time' })
  @IsString()
  clockOutTime: string;
}

// dto/dashboard.dto.ts
export class DashboardQueryDto {
  @ApiProperty({ example: 'business-id', required: false })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({ example: '2024-07-26', required: false })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ example: '2024-07', required: false, description: 'Month in YYYY-MM format' })
  @IsOptional()
  @IsString()
  month?: string;
}

// dto/work-insights.dto.ts
export class WorkInsightsQueryDto {
  @ApiProperty({ example: '2024-07', description: 'Month in YYYY-MM format' })
  @IsString()
  month: string;

  @ApiProperty({ example: 'business-id', required: false })
  @IsOptional()
  @IsString()
  businessId?: string;
}

// dto/engagement.dto.ts
export class RecordEngagementDto {
  @ApiProperty({ example: 'referral_earned', description: 'Engagement type' })
  @IsString()
  type: string;

  @ApiProperty({ example: 50, description: 'Points earned' })
  points: number;

  @ApiProperty({ example: 'Referred a friend', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

// dto/leave.dto.ts
export enum LeaveType {
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal',
  OTHER = 'other',
}

export class WorkforceRequestLeaveDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;

  @ApiProperty({ example: '2024-07-30', description: 'Leave start date' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2024-07-31', description: 'Leave end date' })
  @IsString()
  endDate: string;

  @ApiProperty({ enum: LeaveType, example: 'vacation' })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ example: 'Family vacation', required: false })
  @IsOptional()
  @IsString()
  reason: string;
}

// dto/swap-request.dto.ts
export class WorkforceCreateSwapRequestDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift to swap' })
  @IsString()
  shiftId: string;

  @ApiProperty({ example: 'user-id', required: false, description: 'Specific user to swap with' })
  @IsOptional()
  @IsString()
  swapWithUserId?: string;

  @ApiProperty({ example: 'Need to attend a family event', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

// dto/time-off-request.dto.ts
export class CreateTimeOffRequestDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;

  @ApiProperty({ example: '2024-08-01T09:00:00Z', description: 'Start time' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '2024-08-01T17:00:00Z', description: 'End time' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 'Doctor appointment', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
