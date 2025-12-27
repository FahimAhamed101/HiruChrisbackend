import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;

  @ApiProperty({ example: 'Manager', description: 'Role name' })
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
    description: 'Permission structure for this role',
    example: {
      businessOverview: ['view_business_summary', 'view_business_statistics'],
      peopleManagement: ['accept_reject_job_requests', 'manage_team_members'],
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isPredefined?: boolean;
}

export class UpdateRoleDto {
  @ApiProperty({ example: 'Manager', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Permission structure for this role',
    example: {
      businessOverview: ['view_business_summary', 'view_business_statistics'],
      peopleManagement: ['accept_reject_job_requests', 'manage_team_members'],
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;
}

