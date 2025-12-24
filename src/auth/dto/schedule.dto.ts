// dto/schedule.dto.ts
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ShiftStatusEnum {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  MISSED = 'missed',
  LEAVE_PENDING = 'leave_pending',
  LEAVE_APPROVED = 'leave_approved',
  CANCELLED = 'cancelled',
}

export class GetScheduleDto {
  @ApiProperty({ example: '2025-06-12', description: 'Date to get schedule for (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: 'business-id', description: 'Filter by business', required: false })
  @IsOptional()
  @IsString()
  businessId?: string;
}

// dto/leave-request.dto.ts
export enum LeaveTypeEnum {
  SICK = 'sick',
  VACATION = 'vacation',
  PERSONAL = 'personal',
  EMERGENCY = 'emergency',
}

export class RequestShiftLeaveDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift ID to request leave for' })
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @ApiProperty({ enum: LeaveTypeEnum, example: 'sick', description: 'Type of leave' })
  @IsEnum(LeaveTypeEnum)
  type: LeaveTypeEnum;

  @ApiProperty({ example: 'Not feeling well', description: 'Reason for leave', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveLeaveDto {
  @ApiProperty({ example: 'leave-id', description: 'Leave request ID' })
  @IsString()
  @IsNotEmpty()
  leaveId: string;

  @ApiProperty({ example: true, description: 'Approve or reject' })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ example: 'Approved - feel better soon', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

// dto/overtime.dto.ts
export class RequestOvertimeDto {
  @ApiProperty({ example: 'business-id', description: 'Company/Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: '2025-06-20', description: 'Overtime date' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '10:00', description: 'Overtime start time (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  overtimeStart: string;

  @ApiProperty({ example: '16:00', description: 'Overtime end time (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  overtimeEnd: string;

  @ApiProperty({ example: 'Extra work needed', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

// dto/report-issue.dto.ts
export enum IssueTypeEnum {
  SYSTEM_NOT_WORKING = 'system_not_working',
  WRONG_SCHEDULE = 'wrong_schedule',
  LOCATION_ISSUE = 'location_issue',
  PAYMENT_ISSUE = 'payment_issue',
  OTHER = 'other',
}

export class ReportIssueDto {
  @ApiProperty({ example: 'shift-id', description: 'Related shift ID', required: false })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiProperty({ enum: IssueTypeEnum, example: 'system_not_working' })
  @IsEnum(IssueTypeEnum)
  issueType: IssueTypeEnum;

  @ApiProperty({ example: 'Clock in button not working' })
  @IsString()
  @IsNotEmpty()
  description: string;
}

// dto/shift-summary.dto.ts
export class SubmitShiftSummaryDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift ID' })
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @ApiProperty({ example: 'Great shift, completed all tasks', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    example: ['attachment1.jpg', 'attachment2.pdf'], 
    description: 'File paths of attachments',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

// dto/shift-detail.dto.ts
export class UpdateShiftNotesDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift ID' })
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @ApiProperty({ example: 'Remember to bring ID badge' })
  @IsString()
  @IsNotEmpty()
  notes: string;
}

export class AssignShiftDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift ID' })
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @ApiProperty({ example: 'user-id', description: 'User to assign' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class MessageManagerDto {
  @ApiProperty({ example: 'shift-id', description: 'Related shift ID' })
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @ApiProperty({ example: 'Need clarification about break times' })
  @IsString()
  @IsNotEmpty()
  message: string;
}