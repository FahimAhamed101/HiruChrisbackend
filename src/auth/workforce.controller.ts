// workforce.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
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
import { WorkforceService } from './workforce.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateBusinessDto,
  SelectBusinessDto,
  CreateShiftDto,
  ClockInDto,
  ClockOutDto,
  DashboardQueryDto,
  WorkInsightsQueryDto,
  RecordEngagementDto,
  RequestLeaveDto,
  CreateSwapRequestDto,
  CreateTimeOffRequestDto,
} from './dto/workforce.dto';

@ApiTags('workforce')
@Controller('workforce')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkforceController {
  constructor(private workforceService: WorkforceService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user dashboard with shifts, insights, and widgets' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format' })
  async getDashboard(@Request() req, @Query() query: DashboardQueryDto) {
    return this.workforceService.getDashboard(req.user.id, query);
  }

  // ==================== BUSINESS MANAGEMENT ====================

  @Post('business')
  @ApiOperation({ summary: 'Create a new business' })
  @ApiResponse({ status: 201, description: 'Business created successfully' })
  @ApiResponse({ status: 409, description: 'Business already exists' })
  async createBusiness(@Request() req, @Body() dto: CreateBusinessDto) {
    return this.workforceService.createBusiness(req.user.id, dto);
  }

  @Get('business')
  @ApiOperation({ summary: 'Get all businesses for current user' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async getUserBusinesses(@Request() req) {
    return this.workforceService.getUserBusinesses(req.user.id);
  }

  @Put('business/select')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Select/deselect businesses for dashboard view' })
  @ApiResponse({ status: 200, description: 'Businesses selected successfully' })
  async selectBusinesses(@Request() req, @Body() dto: SelectBusinessDto) {
    return this.workforceService.selectBusinesses(req.user.id, dto);
  }

  // ==================== SHIFT MANAGEMENT ====================

  @Post('shift')
  @ApiOperation({ summary: 'Create a new shift' })
  @ApiResponse({ status: 201, description: 'Shift created successfully' })
  async createShift(@Request() req, @Body() dto: CreateShiftDto) {
    return this.workforceService.createShift(req.user.id, dto);
  }

  @Get('shift')
  @ApiOperation({ summary: 'Get user shifts' })
  @ApiResponse({ status: 200, description: 'Shifts retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format' })
  async getUserShifts(@Request() req, @Query() query: DashboardQueryDto) {
    return this.workforceService.getUserShifts(req.user.id, query);
  }

  @Post('shift/clock-in')
  @ApiOperation({ summary: 'Clock in to a shift' })
  @ApiResponse({ status: 201, description: 'Clocked in successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiResponse({ status: 409, description: 'Already clocked in' })
  async clockIn(@Request() req, @Body() dto: ClockInDto) {
    return this.workforceService.clockIn(req.user.id, dto);
  }

  @Post('shift/clock-out')
  @ApiOperation({ summary: 'Clock out from a shift' })
  @ApiResponse({ status: 201, description: 'Clocked out successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  @ApiResponse({ status: 400, description: 'No active clock-in found' })
  async clockOut(@Request() req, @Body() dto: ClockOutDto) {
    return this.workforceService.clockOut(req.user.id, dto);
  }

  // ==================== WORK INSIGHTS ====================

  @Get('insights')
  @ApiOperation({ summary: 'Get work insights for a specific month' })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format' })
  @ApiQuery({ name: 'businessId', required: false })
  async getWorkInsights(@Request() req, @Query() query: WorkInsightsQueryDto) {
    return this.workforceService.getWorkInsights(req.user.id, query);
  }

  // ==================== ENGAGEMENT & PERKS ====================

  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement and perks statistics' })
  @ApiResponse({ status: 200, description: 'Engagement stats retrieved successfully' })
  async getEngagementStats(@Request() req) {
    return this.workforceService.getEngagementStats(req.user.id);
  }

  @Post('engagement')
  @ApiOperation({ summary: 'Record an engagement activity' })
  @ApiResponse({ status: 201, description: 'Engagement recorded successfully' })
  async recordEngagement(@Request() req, @Body() dto: RecordEngagementDto) {
    return this.workforceService.recordEngagement(req.user.id, dto);
  }

  // ==================== LEAVE MANAGEMENT ====================

  @Post('leave')
  @ApiOperation({ summary: 'Request leave' })
  @ApiResponse({ status: 201, description: 'Leave request submitted successfully' })
  async requestLeave(@Request() req, @Body() dto: RequestLeaveDto) {
    return this.workforceService.requestLeave(req.user.id, dto);
  }

  // ==================== SWAP REQUESTS ====================

  @Post('swap-request')
  @ApiOperation({ summary: 'Create a shift swap request' })
  @ApiResponse({ status: 201, description: 'Swap request created successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async createSwapRequest(@Request() req, @Body() dto: CreateSwapRequestDto) {
    return this.workforceService.createSwapRequest(req.user.id, dto);
  }

  // ==================== QUICK ACTIONS ====================

  @Get('quick-actions')
  @ApiOperation({ summary: 'Get available quick actions' })
  @ApiResponse({ status: 200, description: 'Quick actions retrieved successfully' })
  async getQuickActions() {
    return {
      actions: [
        { id: 'track_hours', label: 'Track Hours', icon: 'clock', route: '/track-hours' },
        { id: 'ot_request', label: 'OT Request', icon: 'overtime', route: '/overtime-request' },
        { id: 'leave', label: 'Leave', icon: 'calendar', route: '/leave-request' },
        { id: 'swap_request', label: 'Swap Request', icon: 'swap', route: '/swap-request' },
      ],
    };
  }

  // ==================== COLLEAGUES ====================

  @Get('colleagues')
  @ApiOperation({ summary: 'Get colleagues in selected businesses' })
  @ApiResponse({ status: 200, description: 'Colleagues retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false })
  async getColleagues(@Request() req, @Query('businessId') businessId?: string) {
    // This would return users who work at the same businesses
    return {
      colleagues: [
        {
          id: 'user-1',
          name: 'Scan QR',
          action: 'scan',
        },
        {
          id: 'user-2',
          name: 'Enter Code',
          action: 'code',
        },
      ],
    };
  }
}