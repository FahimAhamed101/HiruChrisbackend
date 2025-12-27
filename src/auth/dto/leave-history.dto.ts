// dto/leave-history.dto.ts
import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum LeaveStatusFilter {
  ALL = 'all',
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum LeaveTypeRequest {
  SICK_LEAVE = 'sick_leave',
  PERSONAL_LEAVE = 'personal_leave',
  WORK_FROM_HOME = 'work_from_home',
  EMERGENCY_LEAVE = 'emergency_leave',
  CASUAL_LEAVE = 'casual_leave',
  UNPAID_LEAVE = 'unpaid_leave',
  OTHER = 'other',
}

export class GetLeaveHistoryDto {
  @ApiProperty({ example: '2025-04', description: 'Month in YYYY-MM format', required: false })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({ enum: LeaveStatusFilter, example: 'all', required: false })
  @IsOptional()
  @IsEnum(LeaveStatusFilter)
  status?: LeaveStatusFilter;
}

export class RequestLeaveDto {
  @ApiProperty({ example: '2025-04-20', description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-04-23', description: 'End date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: false, description: 'Half day leave', required: false })
  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @ApiProperty({ example: '14:00', description: 'Start time for half day', required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ example: '17:00', description: 'End time for half day', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ enum: LeaveTypeRequest, example: 'sick_leave' })
  @IsEnum(LeaveTypeRequest)
  leaveType: LeaveTypeRequest;

  @ApiProperty({ example: 'Medical checkup', description: 'Reason for leave' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;
}

// dto/track-hours.dto.ts
export class GetTrackHoursDto {
  @ApiProperty({ example: '2025-06', description: 'Month in YYYY-MM format', required: false })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({ example: 'business-id', required: false })
  @IsOptional()
  @IsString()
  businessId?: string;
}

// dto/attendance-log.dto.ts
export class GetAttendanceLogDto {
  @ApiProperty({ example: '2025-06-01', description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2025-06-30', description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 'business-id', required: false })
  @IsOptional()
  @IsString()
  businessId?: string;
}

// dto/overtime-request.dto.ts
export enum OvertimeStatusFilter {
  ALL = 'all',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

export class GetOvertimeRequestsDto {
  @ApiProperty({ enum: OvertimeStatusFilter, example: 'all', required: false })
  @IsOptional()
  @IsEnum(OvertimeStatusFilter)
  status?: OvertimeStatusFilter;

  @ApiProperty({ example: 'send', description: 'Filter: send or received', required: false })
  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateOvertimeRequestDto {
  @ApiProperty({ example: 'shift-id', description: 'Related shift ID', required: false })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiProperty({ example: '2025-06-12', description: 'Overtime date' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00', description: 'Overtime start time' })
  @IsString()
  overtimeStart: string;

  @ApiProperty({ example: '12:00', description: 'Overtime end time' })
  @IsString()
  overtimeEnd: string;

  @ApiProperty({ example: 'Helped close the store', description: 'Reason' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;
}

export class RespondOvertimeDto {
  @ApiProperty({ example: 'overtime-id', description: 'Overtime request ID' })
  @IsString()
  overtimeId: string;

  @ApiProperty({ example: true, description: 'Accept or reject' })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ example: 'Approved for extra hours', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

// dto/swap-request.dto.ts
export enum SwapStatusFilter {
  ALL = 'all',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

export class GetSwapRequestsDto {
  @ApiProperty({ enum: SwapStatusFilter, example: 'all', required: false })
  @IsOptional()
  @IsEnum(SwapStatusFilter)
  status?: SwapStatusFilter;

  @ApiProperty({ example: 'send', description: 'Filter: send or received', required: false })
  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateSwapRequestDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift to swap' })
  @IsString()
  shiftId: string;

  @ApiProperty({ example: 'user-id', description: 'User to swap with', required: false })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiProperty({ example: 'Need to attend family event', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RespondSwapDto {
  @ApiProperty({ example: 'swap-id', description: 'Swap request ID' })
  @IsString()
  swapId: string;

  @ApiProperty({ example: true, description: 'Accept or reject' })
  @IsBoolean()
  accepted: boolean;
}