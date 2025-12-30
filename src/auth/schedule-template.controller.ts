// src/auth/schedule-template.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ScheduleTemplateService } from './schedule-template.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateWeeklyScheduleDto,
  GetWeeklyScheduleDto,
  AssignShiftDto,
  BulkAssignDto,
  UpdateShiftDto,
  DuplicateShiftDto,
  SearchShiftsDto,
  GetAvailableEmployeesDto,
  PreviewScheduleDto,
  GetScheduleStatsDto,
} from './dto/schedule-template.dto';

@ApiTags('schedule-templates')
@Controller('schedule-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScheduleTemplateController {
  constructor(private scheduleTemplateService: ScheduleTemplateService) {}

  // ==================== TEMPLATE MANAGEMENT ====================

  @Post()
  @ApiOperation({ 
    summary: 'Create a new shift template',
    description: 'Create a reusable template for scheduling shifts with role requirements'
  })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient permissions' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createTemplate(@Request() req, @Body() dto: CreateTemplateDto) {
    return this.scheduleTemplateService.createTemplate(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all templates for a business',
    description: 'Returns saved shift templates (Morning Shift, Afternoon Shift, Evening Shift)'
  })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: true, description: 'Business ID' })
  async getTemplates(@Request() req, @Query('businessId') businessId: string) {
    return this.scheduleTemplateService.getTemplates(req.user.id, businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific template' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplate(@Request() req, @Param('id') templateId: string) {
    return this.scheduleTemplateService.getTemplate(req.user.id, templateId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update a template',
    description: 'Edit shift times, breaks, or role requirements'
  })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async updateTemplate(
    @Request() req,
    @Param('id') templateId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.scheduleTemplateService.updateTemplate(req.user.id, templateId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async deleteTemplate(@Request() req, @Param('id') templateId: string) {
    return this.scheduleTemplateService.deleteTemplate(req.user.id, templateId);
  }

  // ==================== WEEKLY SCHEDULE ====================

  @Post('weekly')
  @ApiOperation({ 
    summary: 'Create weekly schedule from template',
    description: 'Generate shifts for selected days using a template (Next button after preview)'
  })
  @ApiResponse({ status: 201, description: 'Weekly schedule created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createWeeklySchedule(@Request() req, @Body() dto: CreateWeeklyScheduleDto) {
    return this.scheduleTemplateService.createWeeklySchedule(req.user.id, dto);
  }

  @Get('weekly/view')
  @ApiOperation({ 
    summary: 'Get weekly schedule',
    description: 'View all shifts for the week with assignments (Weekly Schedule view from Image 5)'
  })
  @ApiResponse({ status: 200, description: 'Weekly schedule retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: true, description: 'Business ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Date within the week (YYYY-MM-DD)' })
  async getWeeklySchedule(@Request() req, @Query() query: GetWeeklyScheduleDto) {
    return this.scheduleTemplateService.getWeeklySchedule(req.user.id, query);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Preview schedule before creating',
    description: 'Shows preview of shifts with assignments before saving (Preview screen from Image 7)'
  })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async previewSchedule(@Request() req, @Body() dto: PreviewScheduleDto) {
    return this.scheduleTemplateService.previewSchedule(req.user.id, dto);
  }

  // ==================== SHIFT DETAILS & MANAGEMENT ====================

  @Get('shifts/:id')
  @ApiOperation({ summary: 'Get detailed shift information' })
  @ApiResponse({ status: 200, description: 'Shift details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  async getShiftDetail(@Request() req, @Param('id') shiftId: string) {
    return this.scheduleTemplateService.getShiftDetail(req.user.id, shiftId);
  }

  @Put('shifts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update shift details',
    description: 'Edit shift name, times, location, or notes'
  })
  @ApiResponse({ status: 200, description: 'Shift updated successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  async updateShift(
    @Request() req,
    @Param('id') shiftId: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.scheduleTemplateService.updateShift(req.user.id, shiftId, dto);
  }

  @Delete('shifts/:id')
  @ApiOperation({ summary: 'Delete a shift' })
  @ApiResponse({ status: 200, description: 'Shift deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  async deleteShift(@Request() req, @Param('id') shiftId: string) {
    return this.scheduleTemplateService.deleteShift(req.user.id, shiftId);
  }

  @Post('shifts/:id/duplicate')
  @ApiOperation({ 
    summary: 'Duplicate a shift',
    description: 'Copy shift to another date with optional assignment copying'
  })
  @ApiResponse({ status: 201, description: 'Shift duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiParam({ name: 'id', description: 'Shift ID to duplicate' })
  async duplicateShift(
    @Request() req,
    @Param('id') shiftId: string,
    @Body() dto: DuplicateShiftDto,
  ) {
    return this.scheduleTemplateService.duplicateShift(req.user.id, shiftId, dto);
  }

  // ==================== SHIFT ASSIGNMENT ====================

  @Post('shifts/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Assign employees to a shift',
    description: 'Assign one or more employees to a shift (Assign button from Image 6)'
  })
  @ApiResponse({ status: 200, description: 'Shift assigned successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiResponse({ status: 409, description: 'Assignment conflict detected' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  async assignShift(
    @Request() req,
    @Param('id') shiftId: string,
    @Body() dto: AssignShiftDto,
  ) {
    return this.scheduleTemplateService.assignShift(req.user.id, shiftId, dto);
  }

  @Post('shifts/bulk-assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Bulk assign multiple shifts',
    description: 'Assign multiple employees to multiple shifts at once'
  })
  @ApiResponse({ status: 200, description: 'Bulk assignment completed' })
  async bulkAssign(@Request() req, @Body() dto: BulkAssignDto) {
    return this.scheduleTemplateService.bulkAssign(req.user.id, dto);
  }

  @Delete('shifts/:shiftId/unassign/:userId')
  @ApiOperation({ 
    summary: 'Remove employee from shift',
    description: 'Unassign a specific employee from a shift'
  })
  @ApiResponse({ status: 200, description: 'Employee unassigned successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  @ApiParam({ name: 'userId', description: 'User ID to unassign' })
  async unassignShift(
    @Request() req,
    @Param('shiftId') shiftId: string,
    @Param('userId') userId: string,
  ) {
    return this.scheduleTemplateService.unassignShift(req.user.id, shiftId, userId);
  }

  // ==================== SEARCH & AVAILABLE EMPLOYEES ====================

  @Get('shifts/search')
  @ApiOperation({ 
    summary: 'Search shifts',
    description: 'Search and filter shifts by date, status, role, etc.'
  })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchShifts(@Request() req, @Query() query: SearchShiftsDto) {
    return this.scheduleTemplateService.searchShifts(req.user.id, query);
  }

  @Get('employees/available')
  @ApiOperation({ 
    summary: 'Get available employees',
    description: 'List employees available for shift assignment (Search Team shown in Image 6)'
  })
  @ApiResponse({ status: 200, description: 'Available employees retrieved successfully' })
  async getAvailableEmployees(@Request() req, @Query() query: GetAvailableEmployeesDto) {
    return this.scheduleTemplateService.getAvailableEmployees(req.user.id, query);
  }

  // ==================== STATISTICS ====================

  @Get('stats/overview')
  @ApiOperation({ 
    summary: 'Get schedule statistics',
    description: 'Get overview of shifts, hours, and employee workload for a date range'
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getScheduleStats(@Request() req, @Query() query: GetScheduleStatsDto) {
    return this.scheduleTemplateService.getScheduleStats(req.user.id, query);
  }

  // ==================== UI HELPERS ====================

  @Get('ui/days-of-week')
  @ApiOperation({ 
    summary: 'Get days of week',
    description: 'Returns list of weekdays for UI selection (List Of Shifts from Image 3)'
  })
  @ApiResponse({ status: 200, description: 'Days retrieved successfully' })
  async getDaysOfWeek() {
    return {
      days: [
        { id: 'monday', name: 'Monday', order: 1 },
        { id: 'tuesday', name: 'Tuesday', order: 2 },
        { id: 'wednesday', name: 'Wednesday', order: 3 },
        { id: 'thursday', name: 'Thursday', order: 4 },
        { id: 'friday', name: 'Friday', order: 5 },
        { id: 'saturday', name: 'Saturday', order: 6 },
        { id: 'sunday', name: 'Sunday', order: 7 },
      ],
    };
  }

  @Get('ui/role-options')
  @ApiOperation({ 
    summary: 'Get available roles',
    description: 'Returns list of roles for the business (Cashier, Receptionist, etc.)'
  })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: true, description: 'Business ID' })
  async getRoleOptions(@Query('businessId') businessId: string) {
    // This would ideally come from a roles table
    return {
      roles: [
        { id: 'cashier', name: 'Cashier', icon: '💰' },
        { id: 'receptionist', name: 'Receptionist', icon: '📞' },
        { id: 'housekeeping', name: 'Housekeeping', icon: '🧹' },
        { id: 'bartender', name: 'Bartender', icon: '🍸' },
        { id: 'waiter', name: 'Waiter', icon: '🍽️' },
        { id: 'chef', name: 'Chef', icon: '👨‍🍳' },
        { id: 'manager', name: 'Manager', icon: '👔' },
      ],
    };
  }
}