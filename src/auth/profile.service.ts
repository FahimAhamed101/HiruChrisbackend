// profile.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, AddCompanyManuallyDto } from './dto/update-profile.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

async getProfile(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { // Use lowercase 'profile' here
        include: {
          socialMedia: true,
          companies: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    isVerified: user.isVerified,
    profileImage: user.profileImage,
    profile: user.profile, // Use lowercase 'profile' here
  };
}

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user basic info if provided
    if (updateProfileDto.fullName) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fullName: updateProfileDto.fullName },
      });
    }

    // Check if profile exists
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    // Create or update profile
    if (!profile) {
      profile = await this.prisma.profile.create({
        data: {
          userId,
          dateOfBirth: updateProfileDto.dateOfBirth,
          gender: updateProfileDto.gender,
          bio: updateProfileDto.bio,
          location: updateProfileDto.location as any,
          interests: updateProfileDto.interests || [],
          profileProgress: updateProfileDto.profileProgress || 0,
        },
      });
    } else {
      profile = await this.prisma.profile.update({
        where: { userId },
        data: {
          ...(updateProfileDto.dateOfBirth && { dateOfBirth: updateProfileDto.dateOfBirth }),
          ...(updateProfileDto.gender && { gender: updateProfileDto.gender }),
          ...(updateProfileDto.bio && { bio: updateProfileDto.bio }),
          ...(updateProfileDto.location && { location: updateProfileDto.location as any }),
          ...(updateProfileDto.interests && { interests: updateProfileDto.interests }),
          ...(updateProfileDto.profileProgress !== undefined && { profileProgress: updateProfileDto.profileProgress }),
        },
      });
    }

    // Handle social media
    if (updateProfileDto.socialMedia) {
      // Delete existing social media entries
      await this.prisma.socialMedia.deleteMany({
        where: { profileId: profile.id },
      });

      // Create new social media entries
      if (updateProfileDto.socialMedia.length > 0) {
        await this.prisma.socialMedia.createMany({
          data: updateProfileDto.socialMedia.map(sm => ({
            profileId: profile.id,
            platform: sm.platform,
            username: sm.username,
            profileHandle: sm.profileId,
            phoneNumber: sm.phoneNumber,
            url: sm.url,
          })),
        });
      }
    }

    // Handle companies
    if (updateProfileDto.companies) {
      // Delete existing company entries
      await this.prisma.company.deleteMany({
        where: { profileId: profile.id },
      });

      // Create new company entries
      if (updateProfileDto.companies.length > 0) {
        await this.prisma.company.createMany({
          data: updateProfileDto.companies.map(company => ({
            profileId: profile.id,
            name: company.name,
            startDate: company.startDate ? new Date(company.startDate) : null,
            endDate: company.endDate ? new Date(company.endDate) : null,
            jobTitle: company.jobTitle,
            isCurrentlyWorking: company.isCurrentlyWorking || false,
          })),
        });
      }
    }

    // Calculate profile completion and check for reward
    const progressResult = await this.calculateProfileProgress(userId);
    
    // If profile is 100% complete, trigger coin reward check
    if (progressResult.progress === 100) {
      // Note: This would typically be done via event system or queue
      // For now, we'll just log it. The user can claim via the coins API
      console.log(`User ${userId} has completed profile 100% - eligible for 5 coins reward`);
    }

    return this.getProfile(userId);
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const maxBytes = 1 * 1024 * 1024;
    if (file.size > maxBytes) {
      const filePath = path.join(process.cwd(), 'uploads', 'profiles', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new BadRequestException('Profile photo must be 1MB or smaller');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old photo if exists
    if (user.profileImage) {
      const oldPath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (error) {
          console.error('Error deleting old photo:', error);
        }
      }
    }

    // File is already saved by multer diskStorage
    // Just store the relative path
    const photoUrl = `/uploads/profiles/${file.filename}`;

    // Update user with new profile image
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: photoUrl,
      },
    });

    const message = user.profileImage 
      ? 'Profile photo updated successfully' 
      : 'Profile photo uploaded successfully';

    return {
      message,
      photoUrl: updatedUser.profileImage,
      fullUrl: `${process.env.APP_URL || 'http://localhost:3000'}${updatedUser.profileImage}`,
    };
  }

  async updateProfilePhoto(userId: string, file: Express.Multer.File) {
    // Check if user has existing photo
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profileImage) {
      throw new BadRequestException('No existing photo to update. Please upload a photo first.');
    }

    // Use the same upload logic to replace the photo
    return this.uploadProfilePhoto(userId, file);
  }

  async deleteProfilePhoto(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.profileImage) {
      throw new NotFoundException('Profile photo not found');
    }

    // Delete file
    const filePath = path.join(process.cwd(), user.profileImage);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: null,
      },
    });

    return {
      message: 'Profile photo deleted successfully',
    };
  }

  async addSocialMedia(userId: string, platform: string, data: any) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const socialMedia = await this.prisma.socialMedia.create({
      data: {
        profileId: profile.id,
        platform,
        username: data.username,
        profileHandle: data.profileHandle,
        phoneNumber: data.phoneNumber,
        url: data.url,
      },
    });

    return {
      message: 'Social media account linked successfully',
      socialMedia,
    };
  }

  async removeSocialMedia(userId: string, socialMediaId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.socialMedia.delete({
      where: {
        id: socialMediaId,
        profileId: profile.id,
      },
    });

    return {
      message: 'Social media account removed successfully',
    };
  }

  async addCompany(userId: string, companyData: any) {
    const name =
      companyData?.name ||
      companyData?.companyName ||
      companyData?.businessName;

    if (!name) {
      throw new BadRequestException('Company name is required');
    }

    let profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.profile.create({
        data: {
          userId,
          interests: [],
          profileProgress: 0,
        },
      });
    }

    if (companyData?.phoneNumber) {
      const existing = await this.prisma.user.findFirst({
        where: {
          phoneNumber: companyData.phoneNumber,
          id: { not: userId },
        },
      });
      if (existing) {
        throw new BadRequestException('Phone number is already in use');
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { phoneNumber: companyData.phoneNumber },
      });
    }

    if (companyData?.about) {
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { bio: companyData.about },
      });
    }

    if (companyData?.location) {
      const location =
        typeof companyData.location === 'string'
          ? this.parseJson(companyData.location, 'location')
          : companyData.location;
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { location: location as any },
      });
    }

    if (companyData?.socialMedia) {
      const socialMedia =
        typeof companyData.socialMedia === 'string'
          ? this.parseJson(companyData.socialMedia, 'socialMedia')
          : companyData.socialMedia;

      if (Array.isArray(socialMedia)) {
        await this.prisma.socialMedia.deleteMany({
          where: { profileId: profile.id },
        });

        if (socialMedia.length > 0) {
          await this.prisma.socialMedia.createMany({
            data: socialMedia.map((sm: any) => ({
              profileId: profile.id,
              platform: sm.platform,
              username: sm.username,
              profileHandle: sm.profileHandle ?? sm.profileId,
              phoneNumber: sm.phoneNumber,
              url: sm.url,
            })),
          });
        }
      }
    }

    const company = await this.prisma.company.create({
      data: {
        profileId: profile.id,
        name,
        startDate: companyData.startDate ? new Date(companyData.startDate) : null,
        endDate: companyData.endDate ? new Date(companyData.endDate) : null,
        jobTitle: companyData.jobTitle,
        isCurrentlyWorking: companyData.isCurrentlyWorking || false,
      },
    });

    return {
      message: 'Company added successfully',
      company,
    };
  }

  async removeCompany(userId: string, companyId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.company.delete({
      where: {
        id: companyId,
        profileId: profile.id,
      },
    });

    return {
      message: 'Company removed successfully',
    };
  }

  async searchCompanies(query: string) {
    // This would typically query a companies database or external API
    // For now, returning mock data
    const mockCompanies = [
      { id: '1', name: 'Ferozi Beach Club', logo: null },
      { id: '2', name: 'Paradise Holiday', logo: null },
      { id: '3', name: 'Seasce Hotel', logo: null },
      { id: '4', name: 'Ferozi Beach Club', logo: null },
    ];

    return mockCompanies.filter(company => 
      company.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getAvailableInterests() {
    // Return list of available interests
    return [
      { id: 'art', name: 'Art', icon: '🎨' },
      { id: 'photography', name: 'Photography', icon: '📷' },
      { id: 'coffee', name: 'Coffee', icon: '☕' },
      { id: 'music', name: 'Music', icon: '🎵' },
      { id: 'social-media', name: 'Social Media', icon: '📱' },
      { id: 'sports', name: 'Sports', icon: '⚽' },
      { id: 'reading', name: 'Reading', icon: '📚' },
      { id: 'poetry', name: 'Poetry', icon: '✍️' },
      { id: 'drawing', name: 'Drawing', icon: '✏️' },
      { id: 'clothing', name: 'Clothing', icon: '👔' },
      { id: 'cooking', name: 'Cooking', icon: '🍳' },
      { id: 'nature', name: 'Nature', icon: '🌿' },
      { id: 'painting', name: 'Painting', icon: '🖌️' },
      { id: 'acting', name: 'Acting', icon: '🎭' },
      { id: 'podcasts', name: 'Podcasts', icon: '🎙️' },
      { id: 'shopping', name: 'Shopping', icon: '🛍️' },
      { id: 'writing', name: 'Writing', icon: '✍️' },
      { id: 'self-care', name: 'Self-care', icon: '💆' },
      { id: 'design', name: 'Design', icon: '🎨' },
      { id: 'crypto', name: 'Crypto', icon: '💰' },
      { id: 'architecture', name: 'Architecture', icon: '🏛️' },
      { id: 'travel', name: 'Travel', icon: '✈️' },
      { id: 'finance', name: 'Finance', icon: '💵' },
      { id: 'makeup', name: 'Makeup', icon: '💄' },
    ];
  }

  async updateInterests(userId: string, interests: string[]) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.profile.update({
      where: { userId },
      data: {
        interests,
      },
    });

    return {
      message: 'Interests updated successfully',
      interests,
    };
  }

 async calculateProfileProgress(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { // Use lowercase 'profile' here
        include: {
          socialMedia: true,
          companies: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  let progress = 0;

  // Basic info
  if (user.fullName) progress += 10;
  if (user.email && user.isVerified) progress += 10;
  if (user.profileImage) progress += 10;

  if (user.profile) { // Use lowercase 'profile' here
    if (user.profile.bio) progress += 10;
    if (user.profile.dateOfBirth) progress += 10;
    if (user.profile.gender) progress += 10;
    if (user.profile.location) progress += 10;
    if (user.profile.socialMedia?.length > 0) progress += 10;
    if (user.profile.companies?.length > 0) progress += 10;
    if (user.profile.interests?.length > 0) progress += 10;
  }

  // Update profile progress
  if (user.profile) { // Use lowercase 'profile' here
    await this.prisma.profile.update({
      where: { userId },
      data: { profileProgress: progress },
    });
  }

  return { progress };
}

  private parseJson(value: string, fieldName: string) {
    try {
      return JSON.parse(value);
    } catch {
      throw new BadRequestException(`Invalid JSON for ${fieldName}`);
    }
  }
}
