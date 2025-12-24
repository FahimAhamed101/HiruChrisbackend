// colleagues-job.controller.ts
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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ColleaguesJobService } from './colleagues-job.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ScanQRDto,
  EnterCodeDto,
  GenerateColleagueCodeDto,
  SearchJobsDto,
  CreateJobListingDto,
  ApplyToJobDto,
} from './dto/join-colleagues.dto';

@ApiTags('colleagues-and-jobs')
@Controller('colleagues-jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ColleaguesJobController {
  constructor(private colleaguesJobService: ColleaguesJobService) {}

  // ==================== JOIN COLLEAGUES ====================

  @Post('colleague-code/generate')
  @ApiOperation({ 
    summary: 'Generate a colleague code for others to join',
    description: 'Creates a 6-character code that expires in 30 minutes (default). Returns both the code and QR data.'
  })
  @ApiResponse({ status: 201, description: 'Code generated successfully' })
  async generateCode(@Request() req, @Body() dto: GenerateColleagueCodeDto) {
    return this.colleaguesJobService.generateColleagueCode(req.user.id, dto);
  }

  @Post('colleague-code/scan-qr')
  @ApiOperation({ 
    summary: 'Scan QR code to join a colleague',
    description: 'Scan another user\'s QR code to join their business'
  })
  @ApiResponse({ status: 201, description: 'Successfully joined as colleague' })
  @ApiResponse({ status: 400, description: 'Invalid or expired QR code' })
  @HttpCode(HttpStatus.OK)
  async scanQR(@Request() req, @Body() dto: ScanQRDto) {
    return this.colleaguesJobService.scanQR(req.user.id, dto);
  }

  @Post('colleague-code/enter')
  @ApiOperation({ 
    summary: 'Enter 6-character code to join a colleague',
    description: 'Manually enter a colleague code (e.g., ABC123) to join their business'
  })
  @ApiResponse({ status: 201, description: 'Successfully joined as colleague' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  @HttpCode(HttpStatus.OK)
  async enterCode(@Request() req, @Body() dto: EnterCodeDto) {
    return this.colleaguesJobService.enterCode(req.user.id, dto);
  }

  @Get('colleagues')
  @ApiOperation({ summary: 'Get all colleagues' })
  @ApiResponse({ status: 200, description: 'Colleagues retrieved successfully' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Filter by business' })
  async getColleagues(@Request() req, @Query('businessId') businessId?: string) {
    return this.colleaguesJobService.getMyColleagues(req.user.id, businessId);
  }

  // ==================== JOB SEARCH & LISTINGS ====================

  @Get('jobs/search')
  @ApiOperation({ 
    summary: 'Search and filter job listings',
    description: 'Find new job opportunities with various filters'
  })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  @ApiQuery({ name: 'query', required: false, description: 'Search query' })
  @ApiQuery({ name: 'location', required: false, description: 'Job location' })
  @ApiQuery({ name: 'category', required: false, description: 'Job category' })
  @ApiQuery({ name: 'jobType', required: false, description: 'Job type (full_time, part_time, etc.)' })
  @ApiQuery({ name: 'minRate', required: false, description: 'Minimum hourly rate' })
  @ApiQuery({ name: 'maxRate', required: false, description: 'Maximum hourly rate' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async searchJobs(@Query() query: SearchJobsDto) {
    return this.colleaguesJobService.searchJobs(query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job listing details' })
  @ApiResponse({ status: 200, description: 'Job details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobById(@Param('id') jobId: string) {
    return this.colleaguesJobService.getJobById(jobId);
  }

  @Post('jobs')
  @ApiOperation({ 
    summary: 'Create a new job listing',
    description: 'Business owners/managers can post new job openings'
  })
  @ApiResponse({ status: 201, description: 'Job listing created successfully' })
  @ApiResponse({ status: 400, description: 'No permission or invalid data' })
  async createJob(@Request() req, @Body() dto: CreateJobListingDto) {
    return this.colleaguesJobService.createJobListing(req.user.id, dto);
  }

  @Post('jobs/:id/apply')
  @ApiOperation({ 
    summary: 'Apply to a job listing',
    description: 'Submit application to a job posting'
  })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 409, description: 'Already applied to this job' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('resume'))
  async applyToJob(
    @Request() req,
    @Param('id') jobId: string,
    @Body('coverLetter') coverLetter: string,
    @UploadedFile() resume?: Express.Multer.File,
  ) {
    const dto: ApplyToJobDto = {
      jobId,
      coverLetter,
      resumePath: resume ? `/uploads/resumes/${resume.filename}` : undefined,
    };

    return this.colleaguesJobService.applyToJob(req.user.id, dto);
  }

  @Get('applications')
  @ApiOperation({ 
    summary: 'Get my job applications',
    description: 'View all jobs you have applied to'
  })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  async getMyApplications(@Request() req) {
    return this.colleaguesJobService.getMyApplications(req.user.id);
  }

  // ==================== UI HELPER ENDPOINTS ====================

  @Get('join-options')
  @ApiOperation({ 
    summary: 'Get join colleague options',
    description: 'Returns the available options for joining colleagues (matches the UI)'
  })
  @ApiResponse({ status: 200, description: 'Options retrieved successfully' })
  async getJoinOptions() {
    return {
      title: 'Join Your Colleagues',
      options: [
        {
          id: 'scan_qr',
          label: 'Scan QR',
          icon: 'qr_code',
          description: 'Scan a colleague\'s QR code',
          action: 'scan',
        },
        {
          id: 'enter_code',
          label: 'Enter Code',
          icon: 'keyboard',
          description: 'Enter a 6-character code',
          action: 'code',
        },
      ],
    };
  }

  @Get('job-categories')
  @ApiOperation({ 
    summary: 'Get available job categories',
    description: 'List of job categories for filtering'
  })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getJobCategories() {
    return {
      categories: [
        { id: 'hospitality', name: 'Hospitality', icon: '🏨' },
        { id: 'retail', name: 'Retail', icon: '🛍️' },
        { id: 'food_service', name: 'Food Service', icon: '🍽️' },
        { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
        { id: 'education', name: 'Education', icon: '📚' },
        { id: 'technology', name: 'Technology', icon: '💻' },
        { id: 'other', name: 'Other', icon: '📋' },
      ],
    };
  }
}