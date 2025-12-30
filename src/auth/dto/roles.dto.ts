// src/auth/dto/roles.dto.ts
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/roles.enum';

// For granular permission control (View/Edit)
export class PermissionAction {
  @ApiProperty({ example: 'view', description: 'Action type: view or edit' })
  @IsString()
  action: 'view' | 'edit';

  @ApiProperty({ example: true, description: 'Whether permission is granted' })
  @IsBoolean()
  enabled: boolean;
}

export class SectionPermissions {
  @ApiProperty({ 
    example: { view: true, edit: false },
    description: 'Permissions for each action in the section'
  })
  @IsObject()
  permissions: Record<string, boolean>;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;

  @ApiProperty({ example: 'Custom Manager', description: 'Role name' })
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
    description: 'Permission structure with view/edit granularity',
    example: {
      business_overview: {
        view_business_overview: true,
        edit_business_overview: false,
        view_business_summary: true,
        view_business_statistics: true,
      },
      people_management: {
        view_employee_profiles: true,
        edit_employee_profiles: false,
        manage_team_members: true,
      }
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, Record<string, boolean>>;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isPredefined?: boolean;
}

export class UpdateRoleDto {
  @ApiProperty({ example: 'Updated Manager', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Updated permissions structure',
    example: {
      business_overview: {
        view_business_overview: true,
        edit_business_overview: true,
      }
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, Record<string, boolean>>;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ example: 'business-id', required: false })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({
    description: 'Permissions structure',
    example: {
      business_overview: {
        view_business_overview: true,
        edit_business_overview: true,
      },
    },
  })
  @IsObject()
  permissions: Record<string, Record<string, boolean>>;
}

export class CreatePredefinedRoleDto {
  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;

  @ApiProperty({ 
    example: UserRole.MANAGER, 
    enum: UserRole, 
    description: 'Predefined role code' 
  })
  @IsEnum(UserRole)
  role: UserRole;
}

// DTO for assigning role to user
export class AssignRoleDto {
  @ApiProperty({ example: 'user-id', description: 'User ID to assign role to' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'role-id', description: 'Role ID to assign' })
  @IsString()
  roleId: string;

  @ApiProperty({ example: 'business-id', description: 'Business ID' })
  @IsString()
  businessId: string;
}
