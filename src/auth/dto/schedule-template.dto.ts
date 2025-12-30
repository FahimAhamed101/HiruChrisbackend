// src/auth/dto/schedule-template.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, Matches, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// ==================== ROLE REQUIREMENT DTO ====================

export class RoleRequirementDto {
  @ApiProperty({ example: 'Cashier', description: 'Role name' })
  @IsString()
  @IsNotEmpty()
  roleName: string;

  @ApiProperty({ example: 2, description: 'Number of employees needed' })
  @IsNumber()
  @Min(1)
  count: number;
}

// ==================== TEMPLATE DTOs ====================

export class CreateTemplateDto {
  @ApiProperty({ example: 'Morning Shift', description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '09:00', description: 'Shift start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'shiftStartTime must be in HH:mm format' })
  shiftStartTime: string;

  @ApiProperty({ example: '17:00', description: 'Shift end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'shiftEndTime must be in HH:mm format' })
  shiftEndTime: string;

  @ApiProperty({ example: '12:00', description: 'Break start time (HH:mm)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'breakStartTime must be in HH:mm format' })
  breakStartTime?: string;

  @ApiProperty({ example: '13:00', description: 'Break end time (HH:mm)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'breakEndTime must be in HH:mm format' })
  breakEndTime?: string;

  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: 'Standard morning shift', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    type: [RoleRequirementDto],
    description: 'Required roles and counts',
    example: [
      { roleName: 'Cashier', count: 2 },
      { roleName: 'Receptionist', count: 1 }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleRequirementDto)
  requiredRoles: RoleRequirementDto[];
}

export class UpdateTemplateDto {
  @ApiProperty({ example: 'Morning Shift', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '09:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'shiftStartTime must be in HH:mm format' })
  shiftStartTime?: string;

  @ApiProperty({ example: '17:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'shiftEndTime must be in HH:mm format' })
  shiftEndTime?: string;

  @ApiProperty({ example: '12:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'breakStartTime must be in HH:mm format' })
  breakStartTime?: string;

  @ApiProperty({ example: '13:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'breakEndTime must be in HH:mm format' })
  breakEndTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [RoleRequirementDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleRequirementDto)
  requiredRoles?: RoleRequirementDto[];
}

// ==================== WEEKLY SCHEDULE DTOs ====================

export class ShiftAssignmentDto {
  @ApiProperty({ example: 'Monday', description: 'Day of the week' })
  @IsString()
  @IsNotEmpty()
  day: string;

  @ApiProperty({ example: 'user-id', description: 'User ID to assign' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Cashier', description: 'Role' })
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class CreateWeeklyScheduleDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: 'template-id', description: 'Template ID to use' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ example: '2025-06-16', description: 'Week start date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate: string;

  @ApiProperty({ 
    example: ['Monday', 'Tuesday', 'Wednesday'],
    description: 'Days to create shifts for'
  })
  @IsArray()
  @IsString({ each: true })
  days: string[];

  @ApiProperty({ 
    type: [ShiftAssignmentDto],
    required: false,
    description: 'Pre-assign employees to shifts'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftAssignmentDto)
  assignments?: ShiftAssignmentDto[];
}

export class GetWeeklyScheduleDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ 
    example: '2025-06-16',
    description: 'Date within the week (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;
}

// ==================== SHIFT ASSIGNMENT DTOs ====================

export class SingleAssignmentDto {
  @ApiProperty({ example: 'user-id', description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Cashier', description: 'Role' })
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class AssignShiftDto {
  @ApiProperty({ 
    type: [SingleAssignmentDto],
    description: 'List of user assignments'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAssignmentDto)
  assignments: SingleAssignmentDto[];
}

export class BulkAssignmentDto {
  @ApiProperty({ example: 'shift-id', description: 'Shift ID' })
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @ApiProperty({ example: 'user-id', description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Cashier', description: 'Role' })
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class BulkAssignDto {
  @ApiProperty({ 
    type: [BulkAssignmentDto],
    description: 'List of shift assignments'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAssignmentDto)
  assignments: BulkAssignmentDto[];
}

// ==================== SHIFT UPDATE DTOs ====================

export class UpdateShiftDto {
  @ApiProperty({ example: 'Morning Shift', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '09:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'shiftStartTime must be in HH:mm format' })
  shiftStartTime?: string;

  @ApiProperty({ example: '17:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'shiftEndTime must be in HH:mm format' })
  shiftEndTime?: string;

  @ApiProperty({ example: '12:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'breakStartTime must be in HH:mm format' })
  breakStartTime?: string;

  @ApiProperty({ example: '13:00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'breakEndTime must be in HH:mm format' })
  breakEndTime?: string;

  @ApiProperty({ example: '126 Avenue Street, Manhattan', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DuplicateShiftDto {
  @ApiProperty({ example: '2025-06-20', description: 'Target date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'targetDate must be in YYYY-MM-DD format' })
  targetDate: string;

  @ApiProperty({ example: true, description: 'Copy assignments', required: false })
  @IsOptional()
  copyAssignments?: boolean;
}

// ==================== SEARCH & FILTER DTOs ====================

export class SearchShiftsDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: 'cashier', required: false })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ example: '2025-06-16', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiProperty({ enum: ['unassigned', 'assigned', 'all'], required: false })
  @IsOptional()
  @IsString()
  status?: 'unassigned' | 'assigned' | 'all';

  @ApiProperty({ example: 'Cashier', required: false })
  @IsOptional()
  @IsString()
  role?: string;
}

export class GetAvailableEmployeesDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: 'shift-id', required: false })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiProperty({ example: 'Cashier', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: '2025-06-16', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;
}

// ==================== PREVIEW DTO ====================

export class PreviewScheduleDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: 'template-id', description: 'Template ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ example: '2025-06-16', description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate: string;

  @ApiProperty({ example: ['Monday', 'Tuesday'] })
  @IsArray()
  @IsString({ each: true })
  days: string[];

  @ApiProperty({ type: [ShiftAssignmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftAssignmentDto)
  assignments?: ShiftAssignmentDto[];
}

// ==================== STATS DTO ====================

export class GetScheduleStatsDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ example: '2025-06-01', description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate: string;

  @ApiProperty({ example: '2025-06-30', description: 'End date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate: string;
}