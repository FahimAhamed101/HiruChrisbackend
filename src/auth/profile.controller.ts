// profile.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, AddCompanyManuallyDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('photo')
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Photo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'No file uploaded' })
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.profileService.uploadProfilePhoto(req.user.id, file);
  }

  @Delete('photo')
  @ApiOperation({ summary: 'Delete profile photo' })
  @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async deletePhoto(@Request() req) {
    return this.profileService.deleteProfilePhoto(req.user.id);
  }

  @Post('social-media')
  @ApiOperation({ summary: 'Add social media account' })
  @ApiResponse({ status: 201, description: 'Social media account linked successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        platform: { type: 'string', example: 'Facebook' },
        username: { type: 'string', example: '@abc_f' },
        profileHandle: { type: 'string', example: 'in/albert-forc12562f25' },
        phoneNumber: { type: 'string', example: '+1(23) 256 25612' },
        url: { type: 'string', example: 'https://facebook.com/user' },
      },
      required: ['platform'],
    },
  })
  async addSocialMedia(
    @Request() req,
    @Body('platform') platform: string,
    @Body() data: any,
  ) {
    return this.profileService.addSocialMedia(req.user.id, platform, data);
  }

  @Delete('social-media/:id')
  @ApiOperation({ summary: 'Remove social media account' })
  @ApiResponse({ status: 200, description: 'Social media account removed successfully' })
  async removeSocialMedia(@Request() req, @Param('id') socialMediaId: string) {
    return this.profileService.removeSocialMedia(req.user.id, socialMediaId);
  }

  @Post('company')
  @ApiOperation({ summary: 'Add company/employer' })
  @ApiResponse({ status: 201, description: 'Company added successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Ferozi Beach Club' },
        startDate: { type: 'string', format: 'date', example: '2020-01-01' },
        endDate: { type: 'string', format: 'date', example: '2023-12-31' },
        jobTitle: { type: 'string', example: 'Software Engineer' },
        isCurrentlyWorking: { type: 'boolean', example: true },
      },
      required: ['name'],
    },
  })
  async addCompany(@Request() req, @Body() companyData: any) {
    return this.profileService.addCompany(req.user.id, companyData);
  }

  @Delete('company/:id')
  @ApiOperation({ summary: 'Remove company/employer' })
  @ApiResponse({ status: 200, description: 'Company removed successfully' })
  async removeCompany(@Request() req, @Param('id') companyId: string) {
    return this.profileService.removeCompany(req.user.id, companyId);
  }

  @Get('companies/search')
  @ApiOperation({ summary: 'Search companies' })
  @ApiResponse({ status: 200, description: 'Companies found' })
  async searchCompanies(@Query('q') query: string) {
    return this.profileService.searchCompanies(query);
  }

  @Post('company/manual')
  @ApiOperation({ summary: 'Add company manually' })
  @ApiResponse({ status: 201, description: 'Company added successfully' })
  @ApiBody({ type: AddCompanyManuallyDto })
  async addCompanyManually(@Request() req, @Body() dto: AddCompanyManuallyDto) {
    return this.profileService.addCompany(req.user.id, {
      name: dto.companyName,
    });
  }

  @Get('interests')
  @ApiOperation({ summary: 'Get available interests' })
  @ApiResponse({ status: 200, description: 'Interests retrieved successfully' })
  async getInterests() {
    return this.profileService.getAvailableInterests();
  }

  @Put('interests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user interests' })
  @ApiResponse({ status: 200, description: 'Interests updated successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        interests: {
          type: 'array',
          items: { type: 'string' },
          example: ['art', 'photography', 'music', 'social-media'],
        },
      },
    },
  })
  async updateInterests(@Request() req, @Body('interests') interests: string[]) {
    return this.profileService.updateInterests(req.user.id, interests);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Calculate profile completion progress' })
  @ApiResponse({ status: 200, description: 'Progress calculated successfully' })
  async getProgress(@Request() req) {
    return this.profileService.calculateProfileProgress(req.user.id);
  }
}