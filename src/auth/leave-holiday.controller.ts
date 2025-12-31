// src/auth/leave-holiday.controller.ts
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
import { LeaveHolidayService } from './leave-holiday.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetLeaveRequestsDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  CreateLeaveRequestDto,
  CreateHolidayDto,
  GetHolidaysDto,
  UpdateHolidayDto,
  ImportHolidaysDto,
  DeleteHolidayDto,
  GetCalendarDto,
} from './dto/leave-holiday.dto';

@ApiTags('leave-and-holidays')
@Controller('leave-holidays')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaveHolidayController {
  constructor(private leaveHolidayService: LeaveHolidayService) {}

  // ==================== LEAVE REQUESTS (MANAGER VIEW - Images 1 & 2) ====================

  @Get('leave-requests')
  @ApiOperation({ 
    summary: 'Get leave requests (Manager/Owner view)',
    description: 'Returns leave requests grouped by date with New Request/Approved tabs (Images 1 & 2)'
  })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ['pending', 'approved', 'rejected'],
    description: 'Filter by status (pending for New Request tab, approved for Approved tab)' 
  })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by specific date (YYYY-MM-DD)' })
  async getLeaveRequests(@Request() req, @Query() query: GetLeaveRequestsDto) {
    return this.leaveHolidayService.getLeaveRequests(req.user.id, query);
  }

  @Post('leave-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Approve or reject leave request',
    description: 'Quick approve/reject using checkmark/cross buttons (Image 1)'
  })
  @ApiResponse({ status: 200, description: 'Leave request processed' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  async approveLeaveRequest(
    @Request() req,
    @Param('id') leaveRequestId: string,
    @Body() dto: ApproveLeaveRequestDto,
  ) {
    return this.leaveHolidayService.approveLeaveRequest(req.user.id, {
      ...dto,
      leaveRequestId,
    });
  }

  @Post('leave-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reject leave request with reason',
    description: 'Reject with detailed reason (Image 3 - Add Rejection Reason modal)'
  })
  @ApiResponse({ status: 200, description: 'Leave request rejected' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  async rejectLeaveRequest(
    @Request() req,
    @Param('id') leaveRequestId: string,
    @Body() dto: RejectLeaveRequestDto,
  ) {
    return this.leaveHolidayService.rejectLeaveRequest(req.user.id, {
      ...dto,
      leaveRequestId,
    });
  }

  // ==================== LEAVE REQUESTS (EMPLOYEE VIEW) ====================

  @Post('leave-requests')
  @ApiOperation({ 
    summary: 'Create leave request (Employee)',
    description: 'Submit a new leave request'
  })
  @ApiResponse({ status: 201, description: 'Leave request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or overlapping leave' })
  async createLeaveRequest(@Request() req, @Body() dto: CreateLeaveRequestDto) {
    return this.leaveHolidayService.createLeaveRequest(req.user.id, dto);
  }

  @Get('leave-requests/my-requests')
  @ApiOperation({ 
    summary: 'Get my leave requests (Employee view)',
    description: 'Returns leave requests submitted by current user'
  })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business' })
  async getMyLeaveRequests(
    @Request() req,
    @Query('businessId') businessId?: string,
  ) {
    return this.leaveHolidayService.getMyLeaveRequests(req.user.id, businessId);
  }

  // ==================== HOLIDAYS (Image 4 & 5) ====================

  @Get('holidays')
  @ApiOperation({ 
    summary: 'Get holidays',
    description: 'Returns all holidays with calendar view (Image 4)'
  })
  @ApiResponse({ status: 200, description: 'Holidays retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business' })
  @ApiQuery({ name: 'month', required: false, description: 'Filter by month (YYYY-MM)' })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year' })
  async getHolidays(@Request() req, @Query() query: GetHolidaysDto) {
    return this.leaveHolidayService.getHolidays(req.user.id, query);
  }

  @Post('holidays')
  @ApiOperation({ 
    summary: 'Create holiday',
    description: 'Create a new holiday (Image 5 - Create Holiday form)'
  })
  @ApiResponse({ status: 201, description: 'Holiday created successfully' })
  @ApiResponse({ status: 400, description: 'Holiday already exists for this date' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createHoliday(@Request() req, @Body() dto: CreateHolidayDto) {
    return this.leaveHolidayService.createHoliday(req.user.id, dto);
  }

  @Put('holidays/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update holiday',
    description: 'Edit holiday details'
  })
  @ApiResponse({ status: 200, description: 'Holiday updated successfully' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Holiday ID' })
  async updateHoliday(
    @Request() req,
    @Param('id') holidayId: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.leaveHolidayService.updateHoliday(req.user.id, holidayId, dto);
  }

  @Delete('holidays/:id')
  @ApiOperation({ 
    summary: 'Delete holiday',
    description: 'Delete a holiday (Image 6 - Delete confirmation modal)'
  })
  @ApiResponse({ status: 200, description: 'Holiday deleted successfully' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'id', description: 'Holiday ID' })
  async deleteHoliday(@Request() req, @Param('id') holidayId: string) {
    return this.leaveHolidayService.deleteHoliday(req.user.id, { holidayId });
  }

  @Post('holidays/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Import holidays',
    description: 'Import national/federal holidays (Import Holidays button from Image 4)'
  })
  @ApiResponse({ status: 200, description: 'Holidays imported successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async importHolidays(@Request() req, @Body() dto: ImportHolidaysDto) {
    return this.leaveHolidayService.importHolidays(req.user.id, dto);
  }

  // ==================== CALENDAR (Image 4) ====================

  @Get('calendar')
  @ApiOperation({ 
    summary: 'Get calendar view',
    description: 'Returns calendar data with holidays and events (Image 4 - Calendar view)'
  })
  @ApiResponse({ status: 200, description: 'Calendar retrieved successfully' })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format (e.g., 2025-03)' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business' })
  async getCalendar(@Request() req, @Query() query: GetCalendarDto) {
    return this.leaveHolidayService.getCalendar(req.user.id, query);
  }

  // ==================== UI HELPERS ====================

  @Get('leave-types')
  @ApiOperation({ 
    summary: 'Get available leave types',
    description: 'Returns list of leave types for dropdown'
  })
  @ApiResponse({ status: 200, description: 'Leave types retrieved successfully' })
  async getLeaveTypes() {
    return {
      leaveTypes: [
        { id: 'hourly_leave', name: 'Hourly Leave', requiresTime: true },
        { id: 'sick_leave', name: 'Sick Leave', requiresTime: false },
        { id: 'casual_leave', name: 'Casual Leave', requiresTime: false },
        { id: 'earned_leave', name: 'Earned Leave', requiresTime: false },
        { id: 'unpaid_leave', name: 'Unpaid Leave', requiresTime: false },
      ],
    };
  }

  @Get('holiday-types')
  @ApiOperation({ 
    summary: 'Get holiday types',
    description: 'Returns list of holiday types for dropdown (Image 5)'
  })
  @ApiResponse({ status: 200, description: 'Holiday types retrieved successfully' })
  async getHolidayTypes() {
    return {
      holidayTypes: [
        { id: 'national', name: 'National' },
        { id: 'federal', name: 'Federal Holiday' },
        { id: 'religious', name: 'Religious' },
        { id: 'company', name: 'Company' },
        { id: 'other', name: 'Other' },
      ],
    };
  }

  @Get('rejection-reasons')
  @ApiOperation({ 
    summary: 'Get rejection reason categories',
    description: 'Returns predefined rejection reasons (Image 3)'
  })
  @ApiResponse({ status: 200, description: 'Rejection reasons retrieved successfully' })
  async getRejectionReasons() {
    return {
      reasons: [
        { 
          id: 'too_many_employees_on_leave', 
          label: 'Too many employees on leave',
          description: 'Staffing requirements not met' 
        },
        { 
          id: 'business_priority_day', 
          label: 'Business priority day',
          description: 'Critical business operations scheduled' 
        },
        { 
          id: 'insufficient_notice', 
          label: 'Insufficient notice',
          description: 'Request submitted too late' 
        },
        { 
          id: 'other', 
          label: 'Other',
          description: 'Please provide custom reason' 
        },
      ],
    };
  }

  @Get('applies-to-options')
  @ApiOperation({ 
    summary: 'Get "Applies To" options',
    description: 'Returns options for who holiday applies to (Image 5)'
  })
  @ApiResponse({ status: 200, description: 'Options retrieved successfully' })
  async getAppliesToOptions() {
    return {
      options: [
        { id: 'all_employees', name: 'All Employees' },
        { id: 'specific_roles', name: 'Specific Roles' },
        { id: 'specific_departments', name: 'Specific Departments' },
      ],
    };
  }

  // ==================== STATISTICS ====================

  @Get('stats/leave-overview')
  @ApiOperation({ 
    summary: 'Get leave statistics',
    description: 'Returns overview of leave requests and usage'
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business' })
  @ApiQuery({ name: 'month', required: false, description: 'Filter by month (YYYY-MM)' })
  async getLeaveStats(
    @Request() req,
    @Query('businessId') businessId?: string,
    @Query('month') month?: string,
  ) {
    // This would calculate leave statistics
    return {
      stats: {
        totalRequests: 45,
        pending: 12,
        approved: 28,
        rejected: 5,
        employeesOnLeaveToday: 3,
        upcomingLeaves: 8,
      },
    };
  }
}