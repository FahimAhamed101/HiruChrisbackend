// leave-tracking.controller.ts - WITH PERMISSION-BASED ACCESS CONTROL
import {
  Controller,
  Get,
  Post,
  Body,
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
} from '@nestjs/swagger';
import { LeaveTrackingService } from './leave-tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetLeaveHistoryDto,
  RequestLeaveDto,
  GetTrackHoursDto,
  GetAttendanceLogDto,
  GetOvertimeRequestsDto,
  CreateOvertimeRequestDto,
  RespondOvertimeDto,
  GetSwapRequestsDto,
  CreateSwapRequestDto,
  RespondSwapDto,
} from './dto/track-hours.dto';

@ApiTags('leave-tracking')
@Controller('leave-tracking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaveTrackingController {
  constructor(private leaveTrackingService: LeaveTrackingService) {}

  // ==================== LEAVE HISTORY ====================

  @Get('leave/history')
  @ApiOperation({ 
    summary: 'Get leave history',
    description: 'Returns leave requests with status filters (All, Approved, Pending, Rejected)'
  })
  @ApiResponse({ status: 200, description: 'Leave history retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ name: 'month', required: false, description: 'Month in YYYY-MM format (e.g., April, 2025)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status: all, approved, pending, rejected' })
  async getLeaveHistory(@Request() req, @Query() query: GetLeaveHistoryDto) {
    return this.leaveTrackingService.getLeaveHistory(req.user.id, query);
  }

  @Post('leave/request')
  @ApiOperation({ 
    summary: 'Request leave',
    description: 'Submit a new leave request with dates, type, and reason'
  })
  @ApiResponse({ status: 201, description: 'Leave request submitted' })
  @ApiResponse({ status: 400, description: 'Insufficient leave balance' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async requestLeave(@Request() req, @Body() dto: RequestLeaveDto) {
    return this.leaveTrackingService.requestLeave(req.user.id, dto);
  }

  // ==================== TRACK HOURS ====================

  @Get('track-hours')
  @ApiOperation({ 
    summary: 'Get track hours overview',
    description: 'Returns monthly overview, daily shift log, and work pattern chart'
  })
  @ApiResponse({ status: 200, description: 'Track hours data retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ name: 'month', required: false, description: 'Month in YYYY-MM format' })
  @ApiQuery({ name: 'businessId', required: false })
  async getTrackHours(@Request() req, @Query() query: GetTrackHoursDto) {
    return this.leaveTrackingService.getTrackHours(req.user.id, query);
  }

  // ==================== ATTENDANCE LOG ====================

  @Get('attendance')
  @ApiOperation({ 
    summary: 'Get attendance log',
    description: 'Returns detailed attendance records with clock in/out times and working hours'
  })
  @ApiResponse({ status: 200, description: 'Attendance log retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'businessId', required: false })
  async getAttendanceLog(@Request() req, @Query() query: GetAttendanceLogDto) {
    return this.leaveTrackingService.getAttendanceLog(req.user.id, query);
  }

  // For managers/owners to view all attendance
  @Get('attendance/all')
  @ApiOperation({ 
    summary: 'Get all attendance logs (Manager/Owner only)',
    description: 'Returns attendance for all employees'
  })
  @ApiResponse({ status: 200, description: 'All attendance logs retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'businessId', required: false })
  async getAllAttendanceLogs(@Request() req, @Query() query: GetAttendanceLogDto) {
    // This would need a new service method for viewing all attendance
    return { message: 'Manager attendance view - to be implemented' };
  }

  // ==================== OVERTIME REQUESTS ====================

  @Get('overtime')
  @ApiOperation({ 
    summary: 'Get overtime requests',
    description: 'Returns overtime requests (Send Request / Received tabs)'
  })
  @ApiResponse({ status: 200, description: 'Overtime requests retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter: all, accepted, rejected, pending' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter: send or received' })
  async getOvertimeRequests(@Request() req, @Query() query: GetOvertimeRequestsDto) {
    return this.leaveTrackingService.getOvertimeRequests(req.user.id, query);
  }

  @Post('overtime/request')
  @ApiOperation({ 
    summary: 'Create overtime request',
    description: 'Submit a new overtime request'
  })
  @ApiResponse({ status: 201, description: 'Overtime request created' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createOvertimeRequest(@Request() req, @Body() dto: CreateOvertimeRequestDto) {
    return this.leaveTrackingService.createOvertimeRequest(req.user.id, dto);
  }

  @Post('overtime/respond')
  @ApiOperation({ 
    summary: 'Respond to overtime request (Manager/Owner only)',
    description: 'Accept or reject overtime request (Reject/Accept buttons)'
  })
  @ApiResponse({ status: 200, description: 'Response submitted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.OK)
  async respondToOvertime(@Request() req, @Body() dto: RespondOvertimeDto) {
    return this.leaveTrackingService.respondToOvertime(req.user.id, dto);
  }

  // ==================== SWAP REQUESTS ====================

  @Get('swap')
  @ApiOperation({ 
    summary: 'Get swap requests',
    description: 'Returns shift swap requests (Send Request / Received tabs)'
  })
  @ApiResponse({ status: 200, description: 'Swap requests retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter: all, accepted, rejected, pending' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter: send or received' })
  async getSwapRequests(@Request() req, @Query() query: GetSwapRequestsDto) {
    return this.leaveTrackingService.getSwapRequests(req.user.id, query);
  }

  @Post('swap/request')
  @ApiOperation({ 
    summary: 'Create swap request',
    description: 'Submit a shift swap request'
  })
  @ApiResponse({ status: 201, description: 'Swap request created' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createSwapRequest(@Request() req, @Body() dto: CreateSwapRequestDto) {
    return this.leaveTrackingService.createSwapRequest(req.user.id, dto);
  }

  @Post('swap/respond')
  @ApiOperation({ 
    summary: 'Respond to swap request',
    description: 'Accept or reject swap request (Reject/Accept buttons). Target user can respond, or manager can approve.'
  })
  @ApiResponse({ status: 200, description: 'Response submitted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.OK)
  async respondToSwap(@Request() req, @Body() dto: RespondSwapDto) {
    // Note: Swap requests don't require special permission if you're the target
    // The service method handles this logic
    return this.leaveTrackingService.respondToSwap(req.user.id, dto);
  }
}
