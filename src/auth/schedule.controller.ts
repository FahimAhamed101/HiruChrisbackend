// schedule.controller.ts - WITH PERMISSION-BASED ACCESS CONTROL
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import {
  GetScheduleDto,
  RequestShiftLeaveDto,
  ApproveLeaveDto,
  RequestOvertimeDto,
  ReportIssueDto,
  SubmitShiftSummaryDto,
  MessageManagerDto,
} from './dto/schedule.dto';

@ApiTags('schedule')
@Controller('schedule')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  // ==================== GET SCHEDULE ====================

  @Get('weekly')
  @RequirePermissions(Permission.VIEW_SCHEDULE)
  @ApiOperation({ 
    summary: 'Get weekly schedule',
    description: 'Returns all shifts for the week containing the specified date'
  })
  @ApiResponse({ status: 200, description: 'Weekly schedule retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business' })
  async getWeeklySchedule(@Request() req, @Query() query: GetScheduleDto) {
    return this.scheduleService.getWeeklySchedule(req.user.id, query);
  }

  @Get('daily/:date')
  @RequirePermissions(Permission.VIEW_SCHEDULE)
  @ApiOperation({ 
    summary: 'Get daily schedule',
    description: 'Returns all shifts for a specific date, including holiday status'
  })
  @ApiResponse({ status: 200, description: 'Daily schedule retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getDailySchedule(@Request() req, @Param('date') date: string) {
    return this.scheduleService.getDailySchedule(req.user.id, date);
  }

  @Get('shift/:shiftId')
  @RequirePermissions(Permission.VIEW_OWN_SHIFTS)
  @ApiOperation({ 
    summary: 'Get shift details',
    description: 'Returns detailed information about a specific shift including countdown timer'
  })
  @ApiResponse({ status: 200, description: 'Shift details retrieved' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async getShiftDetail(@Request() req, @Param('shiftId') shiftId: string) {
    return this.scheduleService.getShiftDetail(req.user.id, shiftId);
  }

  // ==================== LEAVE MANAGEMENT ====================

  @Post('leave/request')
  @RequirePermissions(Permission.REQUEST_LEAVE)
  @ApiOperation({ 
    summary: 'Request leave for a shift',
    description: 'Submit a leave request for a scheduled shift (Sick Leave button)'
  })
  @ApiResponse({ status: 201, description: 'Leave request submitted' })
  @ApiResponse({ status: 400, description: 'Leave already requested or invalid shift' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async requestLeave(@Request() req, @Body() dto: RequestShiftLeaveDto) {
    return this.scheduleService.requestShiftLeave(req.user.id, dto);
  }

  @Post('leave/approve')
  @RequirePermissions(Permission.APPROVE_LEAVE)
  @ApiOperation({ 
    summary: 'Approve or reject leave request (Manager/Owner only)',
    description: 'Manager endpoint to approve/reject leave requests'
  })
  @ApiResponse({ status: 200, description: 'Leave request processed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @HttpCode(HttpStatus.OK)
  async approveLeave(@Request() req, @Body() dto: ApproveLeaveDto) {
    return this.scheduleService.approveLeave(req.user.id, dto);
  }

  // ==================== OVERTIME ====================

  @Post('overtime/request')
  @RequirePermissions(Permission.REQUEST_OVERTIME)
  @ApiOperation({ 
    summary: 'Request overtime',
    description: 'Submit overtime request (Overtime button from Quick Actions)'
  })
  @ApiResponse({ status: 201, description: 'Overtime request submitted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async requestOvertime(@Request() req, @Body() dto: RequestOvertimeDto) {
    return this.scheduleService.requestOvertime(req.user.id, dto);
  }

  // ==================== ISSUE REPORTING ====================

  @Post('issue/report')
  @RequirePermissions(Permission.REPORT_SHIFT_ISSUES)
  @ApiOperation({ 
    summary: 'Report a shift-related issue',
    description: 'Report issues like "System not working" (Report Issue button)'
  })
  @ApiResponse({ status: 201, description: 'Issue reported successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async reportIssue(@Request() req, @Body() dto: ReportIssueDto) {
    return this.scheduleService.reportIssue(req.user.id, dto);
  }

  // ==================== SHIFT SUMMARY ====================

  @Post('shift/summary')
  @RequirePermissions(Permission.SUBMIT_SHIFT_SUMMARY)
  @ApiOperation({ 
    summary: 'Submit shift summary',
    description: 'Submit notes and attachments after completing a shift'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Shift summary submitted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @UseInterceptors(FilesInterceptor('files', 5))
  async submitSummary(
    @Request() req,
    @Body('shiftId') shiftId: string,
    @Body('notes') notes: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const attachments = files?.map(f => `/uploads/summaries/${f.filename}`) || [];
    
    return this.scheduleService.submitShiftSummary(req.user.id, {
      shiftId,
      notes,
      attachments,
    });
  }

  // ==================== MESSAGING ====================

  @Post('message/manager')
  @ApiOperation({ 
    summary: 'Message manager about a shift',
    description: 'Send message to manager (Message button on shift detail)'
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async messageManager(@Request() req, @Body() dto: MessageManagerDto) {
    return this.scheduleService.messageManager(req.user.id, dto);
  }

  // ==================== QUICK ACTIONS (UI HELPERS) ====================

  @Get('quick-actions')
  @ApiOperation({ 
    summary: 'Get available quick actions',
    description: 'Returns the quick action buttons shown on shift details'
  })
  @ApiResponse({ status: 200, description: 'Quick actions retrieved' })
  async getQuickActions() {
    return {
      actions: [
        { id: 'sick_leave', label: 'Sick Leave', icon: 'medical', color: 'blue' },
        { id: 'overtime', label: 'Overtime', icon: 'clock', color: 'blue' },
        { id: 'swap_shift', label: 'Swap Shift', icon: 'swap', color: 'blue' },
        { id: 'report_issue', label: 'Report Issue', icon: 'flag', color: 'blue' },
      ],
    };
  }
}