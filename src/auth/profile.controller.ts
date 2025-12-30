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
  UploadedFiles,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { WorkforceService } from './workforce.service';
import { BusinessType, CreateBusinessDto } from './dto/workforce.dto';
import { UpdateProfileDto, AddCompanyManuallyDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private workforceService: WorkforceService,
  ) {}

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
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: { type: 'string', format: 'binary' },
        fullName: { type: 'string' },
        dateOfBirth: { type: 'string', format: 'date' },
        gender: { type: 'string', enum: ['male', 'female', 'other'] },
        bio: { type: 'string' },
        location: { type: 'string', description: 'JSON string' },
        socialMedia: { type: 'string', description: 'JSON array string' },
        companies: { type: 'string', description: 'JSON array string' },
        interests: { type: 'string', description: 'JSON array string' },
        profileProgress: { type: 'number' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo'))
  async updateProfile(
    @Request() req,
    @Body() formData: any,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (photo) {
      await this.profileService.uploadProfilePhoto(req.user.id, photo);
    }

    const updateProfileDto: UpdateProfileDto = {
      fullName: formData.fullName,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      bio: formData.bio,
      location: formData.location
        ? this.parseJson(formData.location, 'location')
        : undefined,
      socialMedia: formData.socialMedia
        ? this.parseJson(formData.socialMedia, 'socialMedia')
        : undefined,
      companies: formData.companies
        ? this.parseJson(formData.companies, 'companies')
        : undefined,
      interests: formData.interests
        ? this.parseJson(formData.interests, 'interests')
        : undefined,
      profileProgress:
        formData.profileProgress !== undefined
          ? Number(formData.profileProgress)
          : undefined,
    };

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
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create business profile' })
  @ApiResponse({ status: 201, description: 'Business created successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profilePhoto: { type: 'string', format: 'binary' },
        coverPhoto: { type: 'string', format: 'binary' },
        businessName: { type: 'string', description: 'Business name (alias for name)' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['hotel', 'restaurant', 'bar', 'retail', 'other'] },
        phoneNumber: { type: 'string' },
        address: { type: 'string' },
        about: { type: 'string', description: 'Business description (alias for description)' },
        description: { type: 'string' },
        location: { type: 'string', description: 'JSON string' },
        socialMedia: { type: 'string', description: 'JSON array string' },
        logo: { type: 'string', description: 'Optional logo URL' },
      },
      required: ['name'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profilePhoto', maxCount: 1 },
      { name: 'coverPhoto', maxCount: 1 },
    ]),
  )
  async createBusinessProfile(
    @Request() req,
    @Body() formData: any,
    @UploadedFiles()
    files?: {
      profilePhoto?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
    },
  ) {
    const rawName =
      formData.businessName || formData.name || formData.companyName || '';
    const name = String(rawName).trim();
    const rawType = String(formData.type || '').trim();
    const type = (Object.values(BusinessType).includes(rawType as BusinessType)
      ? rawType
      : BusinessType.OTHER) as BusinessType;

    const dto: CreateBusinessDto = {
      name,
      type,
      phoneNumber: formData.phoneNumber,
      address: formData.address,
      description: formData.about || formData.description,
      location: formData.location,
      socialMedia: formData.socialMedia,
      logo: formData.logo,
    };

    if (!dto.name) {
      throw new BadRequestException('Business name is required');
    }

    return this.workforceService.createBusiness(req.user.id, dto, files);
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

  private parseJson(value: string, fieldName: string) {
    try {
      return JSON.parse(value);
    } catch {
      throw new BadRequestException(`Invalid JSON for ${fieldName}`);
    }
  }
}
