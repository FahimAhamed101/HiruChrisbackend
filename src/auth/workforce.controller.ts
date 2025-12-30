// workforce.controller.ts
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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
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
  WorkforceRequestLeaveDto,
  WorkforceCreateSwapRequestDto,
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
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new business' })
  @ApiResponse({ status: 201, description: 'Business created successfully' })
  @ApiResponse({ status: 409, description: 'Business already exists' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profilePhoto: { type: 'string', format: 'binary' },
        coverPhoto: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['hotel', 'restaurant', 'bar', 'retail', 'other'] },
        phoneNumber: { type: 'string' },
        address: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string', description: 'JSON string' },
        socialMedia: { type: 'string', description: 'JSON array string' },
        logo: { type: 'string', description: 'Optional logo URL' },
      },
      required: ['name', 'type'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profilePhoto', maxCount: 1 },
      { name: 'coverPhoto', maxCount: 1 },
    ]),
  )
  async createBusiness(
    @Request() req,
    @Body() dto: CreateBusinessDto,
    @UploadedFiles()
    files?: {
      profilePhoto?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
    },
  ) {
    return this.workforceService.createBusiness(req.user.id, dto, files);
  }

  @Get('business/home')
  @ApiOperation({ summary: 'Get business owner home dashboard' })
  @ApiResponse({ status: 200, description: 'Business home data retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Business ID' })
  async getBusinessHome(@Request() req, @Query('businessId') businessId?: string) {
    return this.workforceService.getBusinessHome(req.user.id, businessId);
  }

  @Get('manager/home')
  @ApiOperation({ summary: 'Get manager home dashboard' })
  @ApiResponse({ status: 200, description: 'Manager home data retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Business ID' })
  async getManagerHome(@Request() req, @Query('businessId') businessId?: string) {
    return this.workforceService.getManagerHome(req.user.id, businessId);
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
  async requestLeave(@Request() req, @Body() dto: WorkforceRequestLeaveDto) {
    return this.workforceService.requestLeave(req.user.id, dto);
  }

  // ==================== SWAP REQUESTS ====================

  @Post('swap-request')
  @ApiOperation({ summary: 'Create a shift swap request' })
  @ApiResponse({ status: 201, description: 'Swap request created successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async createSwapRequest(@Request() req, @Body() dto: WorkforceCreateSwapRequestDto) {
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
