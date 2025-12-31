// colleagues-job.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScanQRDto,
  EnterCodeDto,
  GenerateColleagueCodeDto,
  SearchJobsDto,
  CreateJobListingDto,
  ApplyToJobDto,
  GetJobApplicationsDto,
} from './dto/join-colleagues.dto';
import * as crypto from 'crypto';

@Injectable()
export class ColleaguesJobService {
  constructor(private prisma: PrismaService) {}

  // ==================== JOIN COLLEAGUES ====================


async getReceivedApplications(userId: string, dto: GetJobApplicationsDto) {
  // Verify user owns/manages businesses
  const userBusinesses = await this.prisma.userBusiness.findMany({
    where: {
      userId,
      role: { in: ['owner', 'manager'] },
    },
    select: { businessId: true },
  });

  if (userBusinesses.length === 0) {
    throw new BadRequestException('No permission to view applications');
  }

  const businessIds = userBusinesses.map(ub => ub.businessId);

  const where: any = {
    job: {
      businessId: { in: businessIds },
    },
  };

  if (dto.jobId) {
    where.jobId = dto.jobId;
  }

  if (dto.status && dto.status !== 'all') {
    where.status = dto.status;
  }

  const applications = await this.prisma.jobApplication.findMany({
    where,
    include: {
      applicant: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          profile: {
            select: {
              bio: true,
              companies: true,
            },
          },
        },
      },
      job: {
        include: {
          business: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    applications: applications.map(app => ({
      id: app.id,
      status: app.status,
      appliedAt: app.createdAt,
      updatedAt: app.updatedAt,
      coverLetter: app.coverLetter,
      resumePath: app.resumePath,
      applicant: {
        id: app.applicant.id,
        name: app.applicant.fullName,
        email: app.applicant.email,
        phone: app.applicant.phoneNumber,
        profileImage: app.applicant.profileImage,
        bio: app.applicant.profile?.bio,
        experience: app.applicant.profile?.companies || [],
      },
      job: {
        id: app.job.id,
        title: app.job.title,
        hourlyRate: app.job.hourlyRate,
        location: app.job.location,
        jobType: app.job.jobType,
        business: app.job.business,
      },
    })),
    total: applications.length,
  };
}

async updateApplicationStatus(
  userId: string,
  applicationId: string,
  status: 'reviewed' | 'accepted' | 'rejected',
  notes?: string,
) {
  const application = await this.prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        include: { business: true },
      },
      applicant: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  // Verify user has permission
  const userBusiness = await this.prisma.userBusiness.findFirst({
    where: {
      userId,
      businessId: application.job.businessId,
      role: { in: ['owner', 'manager'] },
    },
  });

  if (!userBusiness) {
    throw new BadRequestException('No permission to update this application');
  }

  const updated = await this.prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  // TODO: Send notification to applicant about status change

  return {
    message: `Application ${status} successfully`,
    application: {
      id: updated.id,
      status: updated.status,
      applicantName: application.applicant.fullName,
      jobTitle: application.job.title,
    },
  };
}

async withdrawApplication(userId: string, applicationId: string) {
  const application = await this.prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  if (application.applicantId !== userId) {
    throw new BadRequestException('You can only withdraw your own applications');
  }

  if (application.status !== 'pending') {
    throw new BadRequestException(
      `Cannot withdraw application with status: ${application.status}`,
    );
  }

  await this.prisma.jobApplication.delete({
    where: { id: applicationId },
  });

  return {
    message: 'Application withdrawn successfully',
    jobTitle: application.job.title,
  };
}




  async generateColleagueCode(userId: string, dto: GenerateColleagueCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate 6-character alphanumeric code
    const code = this.generateRandomCode();
    
    // Calculate expiry time (default 30 minutes)
    const expiryMinutes = dto.expiryMinutes || 30;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Create or update colleague code
    const colleagueCode = await this.prisma.colleagueCode.upsert({
      where: { userId },
      update: {
        code,
        expiresAt,
        businessId: dto.businessId,
        isUsed: false,
      },
      create: {
        userId,
        code,
        expiresAt,
        businessId: dto.businessId,
        isUsed: false,
      },
    });

    // Generate QR data (could be a URL or JSON string)
    const qrData = JSON.stringify({
      code: code,
      userId: userId,
      businessId: dto.businessId,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      message: 'Colleague code generated successfully',
      code: code,
      qrData: qrData,
      expiresAt: expiresAt,
      expiresIn: `${expiryMinutes} minutes`,
    };
  }

  async scanQR(userId: string, dto: ScanQRDto) {
    let qrData: any;
    
    try {
      qrData = JSON.parse(dto.qrData);
    } catch (error) {
      throw new BadRequestException('Invalid QR code data');
    }

    const { code, userId: targetUserId, businessId } = qrData;

    if (!code || !targetUserId) {
      throw new BadRequestException('Invalid QR code format');
    }

    // Verify the code
    return this.joinViaCode(userId, { code }, businessId);
  }

  async enterCode(userId: string, dto: EnterCodeDto) {
    return this.joinViaCode(userId, dto);
  }

  private async joinViaCode(userId: string, dto: EnterCodeDto, businessId?: string) {
    // Find the colleague code
    const colleagueCode = await this.prisma.colleagueCode.findFirst({
      where: {
        code: dto.code.toUpperCase(),
        isUsed: false,
      },
      include: {
        user: true,
      },
    });

    if (!colleagueCode) {
      throw new NotFoundException('Invalid or expired code');
    }

    // Check if code has expired
    if (new Date() > colleagueCode.expiresAt) {
      throw new BadRequestException('This code has expired');
    }

    const targetBusinessId = businessId || colleagueCode.businessId;

    if (!targetBusinessId) {
      throw new BadRequestException('No business specified');
    }

    // Check if user is already part of this business
    const existingConnection = await this.prisma.userBusiness.findFirst({
      where: {
        userId: userId,
        businessId: targetBusinessId,
      },
    });

    if (existingConnection) {
      return {
        message: 'You are already a member of this business',
        business: await this.prisma.business.findUnique({
          where: { id: targetBusinessId },
        }),
      };
    }

    // Add user to the business
    const userBusiness = await this.prisma.userBusiness.create({
      data: {
        userId: userId,
        businessId: targetBusinessId,
        role: 'employee',
        isSelected: true,
      },
      include: {
        business: true,
      },
    });

    // Mark code as used
    await this.prisma.colleagueCode.update({
      where: { id: colleagueCode.id },
      data: { isUsed: true },
    });

    // Create connection between users (optional - for social features)
    if (userId !== colleagueCode.userId) {
      await this.createUserConnection(userId, colleagueCode.userId);
    }

    return {
      message: 'Successfully joined as a colleague!',
      business: userBusiness.business,
      connectedWith:
        userId !== colleagueCode.userId
          ? {
              id: colleagueCode.user.id,
              name: colleagueCode.user.fullName,
              profileImage: colleagueCode.user.profileImage,
            }
          : null,
    };
  }

  async getMyColleagues(userId: string, businessId?: string) {
    const where: any = { userId };
    
    if (businessId) {
      where.businessId = businessId;
    }

    // Get all businesses the user is part of
    const userBusinesses = await this.prisma.userBusiness.findMany({
      where,
      include: {
        business: {
          include: {
            users: {
              where: {
                userId: { not: userId }, // Exclude self
              },
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    profileImage: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Format colleagues by business
    const colleagues = userBusinesses.map(ub => ({
      business: {
        id: ub.business.id,
        name: ub.business.name,
        logo: ub.business.logo,
      },
      colleagues: ub.business.users.map(u => ({
        id: u.user.id,
        name: u.user.fullName,
        email: u.user.email,
        profileImage: u.user.profileImage,
        role: u.role,
      })),
    }));

    return colleagues;
  }

  // ==================== JOB SEARCH ====================

  async searchJobs(dto: SearchJobsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    // Build search filters
    if (dto.query) {
      where.OR = [
        { title: { contains: dto.query, mode: 'insensitive' } },
        { description: { contains: dto.query, mode: 'insensitive' } },
      ];
    }

    if (dto.location) {
      where.location = { contains: dto.location, mode: 'insensitive' };
    }

    if (dto.category) {
      where.category = dto.category;
    }

    if (dto.jobType) {
      where.jobType = dto.jobType;
    }

    if (dto.minRate || dto.maxRate) {
      const minRate = dto.minRate ? Number(dto.minRate) : undefined;
      const maxRate = dto.maxRate ? Number(dto.maxRate) : undefined;

      where.hourlyRate = {};
      if (Number.isFinite(minRate)) where.hourlyRate.gte = minRate;
      if (Number.isFinite(maxRate)) where.hourlyRate.lte = maxRate;
    }

    const jobs = await this.prisma.jobListing.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            logo: true,
            type: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const seenBusinesses = new Set<string>();
    const uniqueJobs = jobs.filter(job => {
      if (seenBusinesses.has(job.businessId)) {
        return false;
      }
      seenBusinesses.add(job.businessId);
      return true;
    });

    const pagedJobs = uniqueJobs.slice(skip, skip + limit);
    const total = uniqueJobs.length;

    return {
      jobs: pagedJobs.map(job => this.formatJobListing(job)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getJobById(jobId: string) {
    const job = await this.prisma.jobListing.findUnique({
      where: { id: jobId },
      include: {
        business: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job listing not found');
    }

    return this.formatJobListing(job);
  }

  async createJobListing(userId: string, dto: CreateJobListingDto) {
    // Verify user has permission to post for this business
    const userBusiness = await this.prisma.userBusiness.findFirst({
      where: {
        userId,
        businessId: dto.businessId,
        OR: [{ role: { equals: 'owner', mode: 'insensitive' } }, { role: { equals: 'manager', mode: 'insensitive' } }],
      },
    });

    if (!userBusiness) {
      throw new BadRequestException(
        'You do not have permission to post jobs for this business',
      );
    }

    const jobListing = await this.prisma.jobListing.create({
      data: {
        businessId: dto.businessId,
        postedBy: userId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        jobType: dto.jobType || 'full_time',
        category: dto.category || 'other',
        hourlyRate: dto.hourlyRate,
        requiredSkills: dto.requiredSkills || [],
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        isActive: true,
      },
      include: {
        business: true,
      },
    });

    return {
      message: 'Job listing created successfully',
      job: this.formatJobListing(jobListing),
    };
  }

  async applyToJob(userId: string, dto: ApplyToJobDto) {
    // Check if job exists
    let job = await this.prisma.jobListing.findUnique({
      where: { id: dto.jobId },
    });

    if (!job) {
      job = await this.prisma.jobListing.findFirst({
        where: {
          businessId: dto.jobId,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!job) {
      throw new NotFoundException('Job listing not found');
    }

    if (!job.isActive) {
      throw new BadRequestException('This job listing is no longer active');
    }

    // Check if already applied
    const existingApplication = await this.prisma.jobApplication.findFirst({
      where: {
        jobId: job.id,
        applicantId: userId,
      },
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied to this job');
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        jobId: job.id,
        applicantId: userId,
        coverLetter: dto.coverLetter,
        resumePath: dto.resumePath,
        status: 'pending',
      },
      include: {
        job: {
          include: {
            business: true,
          },
        },
      },
    });

    return {
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        jobTitle: application.job.title,
        business: application.job.business.name,
        appliedAt: application.createdAt,
        status: application.status,
      },
    };
  }

  async getMyApplications(userId: string) {
    const applications = await this.prisma.jobApplication.findMany({
      where: { applicantId: userId },
      include: {
        job: {
          include: {
            business: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return applications.map(app => ({
      id: app.id,
      job: this.formatJobListing(app.job),
      coverLetter: app.coverLetter,
      status: app.status,
      appliedAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));
  }

  // ==================== HELPER METHODS ====================

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async createUserConnection(userId1: string, userId2: string) {
    // Create bidirectional connection (optional feature)
    try {
      await this.prisma.userConnection.createMany({
        data: [
          { userId: userId1, connectedUserId: userId2 },
          { userId: userId2, connectedUserId: userId1 },
        ],
        skipDuplicates: true,
      });
    } catch (error) {
      // Connection might already exist, ignore error
      console.log('Connection already exists or error creating connection');
    }
  }

  private formatJobListing(job: any) {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      jobType: job.jobType,
      category: job.category,
      hourlyRate: job.hourlyRate,
      requiredSkills: job.requiredSkills,
      deadline: job.deadline,
      business: {
        id: job.business.id,
        name: job.business.name,
        logo: job.business.logo,
        type: job.business.type,
      },
      applicationsCount: job._count?.applications || 0,
      isActive: job.isActive,
      postedAt: job.createdAt,
    };
  }
}
