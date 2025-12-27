// workforce.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { UserRole } from './enums/roles.enum';
import { ROLE_PERMISSIONS } from './config/role-permissions.config';
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
import { CreatePredefinedRoleDto, CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';

@Injectable()
export class WorkforceService {
  constructor(private prisma: PrismaService) {}

  // ==================== DASHBOARD ====================

  async getDashboard(userId: string, query: DashboardQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBusinesses: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const today = query.date ? new Date(query.date) : new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // Get today's shifts
    const todayShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
        ...(query.businessId && { businessId: query.businessId }),
      },
      include: {
        business: true,
        attendance: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Check if today is a holiday
    const isHoliday = await this.checkIfHoliday(todayStart);

    // Get profile completion
    const profileCompletion = await this.calculateProfileCompletion(userId);

    // Get work insights for the month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthInsights = await this.getWorkInsights(userId, {
      month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      businessId: query.businessId,
    });

    // Get engagement stats
    const engagementStats = await this.getEngagementStats(userId);

    // Get widgets/shift summary
    const recentShifts = await this.prisma.shift.findMany({
      where: { userId },
      take: 5,
      orderBy: { startTime: 'desc' },
      include: {
        business: true,
        attendance: true,
      },
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        profileImage: user.profileImage,
      },
      greeting: this.getGreeting(),
      readyMessage: "Ready for today's task?",
      profileCompletion,
      businesses: user.userBusinesses.map(ub => ({
        id: ub.business.id,
        name: ub.business.name,
        type: ub.business.type,
        logo: ub.business.logo,
        isSelected: ub.isSelected,
      })),
      todayShifts: todayShifts.map(shift => this.formatShift(shift)),
      isHoliday,
      holidayMessage: isHoliday ? {
        title: "Today is a Holiday",
        subtitle: "No Shift – It's a Holiday!",
        message: "Enjoy your day off! You've earned it. Come back refreshed and ready.",
        time: "Next shift Tue, 10:00 AM"
      } : null,
      quickActions: [
        { id: 'track_hours', label: 'Track Hours', icon: 'clock' },
        { id: 'ot_request', label: 'OT Request', icon: 'overtime' },
        { id: 'leave', label: 'Leave', icon: 'calendar' },
        { id: 'swap_request', label: 'Swap Request', icon: 'swap' },
      ],
      workInsights: monthInsights,
      engagementAndPerks: engagementStats,
      widgets: {
        recentShiftSummary: this.formatRecentShiftSummary(recentShifts),
      },
    };
  }

  // ==================== BUSINESS MANAGEMENT ====================

  async getBusinessHome(userId: string, businessId?: string) {
    const business = await this.prisma.business.findFirst({
      where: {
        ...(businessId ? { id: businessId } : {}),
        ownerId: userId,
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const trendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [
      employeeCount,
      managerCount,
      totalShiftsThisMonth,
      completedShiftsThisMonth,
      totalHoursThisMonth,
      todayShifts,
      todayAttendance,
      overtimeRequestsThisMonth,
      leaveRequestsThisMonth,
      activeJobListings,
      recentShifts,
      businessUsers,
      ratingStats,
      newRatingsThisWeek,
    ] = await Promise.all([
      this.prisma.userBusiness.count({ where: { businessId: business.id } }),
      this.prisma.userBusiness.count({ where: { businessId: business.id, role: 'manager' } }),
      this.prisma.shift.count({
        where: {
          businessId: business.id,
          startTime: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.shift.count({
        where: {
          businessId: business.id,
          status: 'completed',
          startTime: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.shift.aggregate({
        where: {
          businessId: business.id,
          startTime: { gte: monthStart, lte: monthEnd },
        },
        _sum: { actualHours: true },
      }),
      this.prisma.shift.findMany({
        where: {
          businessId: business.id,
          startTime: { gte: todayStart, lte: todayEnd },
        },
        include: {
          attendance: true,
          user: true,
        },
      }),
      this.prisma.attendance.findMany({
        where: {
          shift: {
            businessId: business.id,
            startTime: { gte: todayStart, lte: todayEnd },
          },
        },
      }),
      this.prisma.overtimeRequest.count({
        where: {
          businessId: business.id,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          businessId: business.id,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.jobListing.count({
        where: {
          businessId: business.id,
          isActive: true,
        },
      }),
      this.prisma.shift.findMany({
        where: {
          businessId: business.id,
          startTime: { gte: trendStart, lte: todayEnd },
        },
        include: { user: true },
      }),
      this.prisma.userBusiness.findMany({
        where: { businessId: business.id },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      }),
      this.prisma.rating.aggregate({
        where: { businessId: business.id },
        _avg: { score: true },
      }),
      this.prisma.rating.count({
        where: {
          businessId: business.id,
          createdAt: { gte: weekStart, lte: todayEnd },
        },
      }),
    ]);

    const totalHoursValue = totalHoursThisMonth._sum.actualHours || 0;
    const todayTotal = todayShifts.length;
    const todayCompleted = todayShifts.filter(shift => shift.status === 'completed').length;
    const todayOngoing = todayShifts.filter(shift => shift.status === 'ongoing').length;
    const todayScheduled = todayShifts.filter(shift => shift.status === 'scheduled').length;
    const todayMissed = todayShifts.filter(shift => shift.status === 'missed').length;

    const clockedInCount = todayAttendance.filter(a => !a.clockOut).length;
    const clockedOutCount = todayAttendance.filter(a => a.clockOut).length;

    const trendDays = this.buildTrendDays(trendStart, todayEnd);
    const trendMap = new Map(trendDays.map(day => [day, { date: day, completed: 0, missed: 0 }]));
    for (const shift of recentShifts) {
      const key = this.formatDateKey(shift.startTime);
      const entry = trendMap.get(key);
      if (!entry) continue;
      if (shift.status === 'completed') entry.completed += 1;
      if (shift.status === 'missed') entry.missed += 1;
    }

    const topPerformers = this.buildTopPerformers(recentShifts, employeeCount);

    const profileProgressValues = businessUsers
      .map(entry => entry.user?.profile?.profileProgress)
      .filter((value): value is number => typeof value === 'number');
    const profilesCompletion =
      profileProgressValues.length > 0
        ? Math.round(
            profileProgressValues.reduce((sum, value) => sum + value, 0) /
              profileProgressValues.length,
          )
        : 0;

    return {
      business: {
        id: business.id,
        name: business.name,
        logo: business.logo,
        profileImage: business.profileImage,
        coverImage: business.coverImage,
      },
      businessSummary: {
        employees: employeeCount,
        managers: managerCount,
        totalShifts: totalShiftsThisMonth,
        completedShifts: completedShiftsThisMonth,
        totalHours: Math.round(totalHoursValue * 10) / 10,
        profilesCompletion,
      },
      todaysShiftsSummary: {
        total: todayTotal,
        scheduled: todayScheduled,
        ongoing: todayOngoing,
        completed: todayCompleted,
        missed: todayMissed,
      },
      todaysAttendanceSummary: {
        clockedIn: clockedInCount,
        clockedOut: clockedOutCount,
      },
      performanceTrend: {
        range: 'last_7_days',
        series: Array.from(trendMap.values()),
      },
      teamInsights: {
        avgHoursPerEmployee: employeeCount > 0 ? Math.round((totalHoursValue / employeeCount) * 10) / 10 : 0,
        overtimeRequests: overtimeRequestsThisMonth,
        leaveRequests: leaveRequestsThisMonth,
        newRatingsThisWeek,
        averageRating: ratingStats._avg.score
          ? Math.round(ratingStats._avg.score * 10) / 10
          : 0,
      },
      quickActions: [
        { id: 'create_shift', label: 'Create Shift', icon: 'calendar' },
        { id: 'manage_team', label: 'Team', icon: 'users' },
        { id: 'job_posting', label: 'Post Job', icon: 'briefcase' },
      ],
      jobBoard: {
        activeListings: activeJobListings,
      },
      topPerformers,
    };
  }

  async getManagerHome(userId: string, businessId?: string) {
    const managerBusiness = await this.prisma.userBusiness.findFirst({
      where: {
        userId,
        role: 'manager',
        ...(businessId ? { businessId } : {}),
      },
      include: { business: true },
    });

    if (!managerBusiness) {
      throw new NotFoundException('Business not found for manager');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const business = managerBusiness.business;

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [
      todayShifts,
      employeeCount,
      leaveTodayCount,
      activeJobListings,
      ratingStats,
      newRatingsThisWeek,
    ] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          businessId: business.id,
          startTime: { gte: todayStart, lte: todayEnd },
        },
        include: { attendance: true, user: true },
      }),
      this.prisma.userBusiness.count({ where: { businessId: business.id } }),
      this.prisma.leaveRequest.count({
        where: {
          businessId: business.id,
          status: 'approved',
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart },
        },
      }),
      this.prisma.jobListing.count({
        where: { businessId: business.id, isActive: true },
      }),
      this.prisma.rating.aggregate({
        where: { businessId: business.id },
        _avg: { score: true },
      }),
      this.prisma.rating.count({
        where: {
          businessId: business.id,
          createdAt: { gte: weekStart, lte: todayEnd },
        },
      }),
    ]);

    let scheduledCount = 0;
    let ongoingCount = 0;
    let lateArrivals = 0;
    let onTimeArrivals = 0;
    let absentToday = 0;

    for (const shift of todayShifts) {
      if (shift.status === 'scheduled') scheduledCount += 1;
      if (shift.status === 'ongoing') ongoingCount += 1;

      const attendance = shift.attendance;
      if (attendance?.clockIn) {
        if (attendance.clockIn > shift.startTime) {
          lateArrivals += 1;
        } else {
          onTimeArrivals += 1;
        }
      } else if (shift.startTime < now) {
        absentToday += 1;
      }
    }

    return {
      business: {
        id: business.id,
        name: business.name,
        logo: business.logo,
        profileImage: business.profileImage,
      },
      todaysShiftsSummary: {
        totalScheduled: scheduledCount,
        lateArrivals,
        currentlyWorking: ongoingCount,
      },
      todaysAttendanceSummary: {
        onTime: onTimeArrivals,
        late: lateArrivals,
        absent: absentToday,
      },
      teamInsights: {
        totalEmployees: employeeCount,
        onLeaveToday: leaveTodayCount,
        newRatingsThisWeek,
        averageRating: ratingStats._avg.score
          ? Math.round(ratingStats._avg.score * 10) / 10
          : 0,
      },
      quickActions: [
        { id: 'leave', label: 'Leave', icon: 'leave' },
        { id: 'shift_request', label: 'Shift Request', icon: 'shift' },
        { id: 'team_panel', label: 'Team Panel', icon: 'team' },
        { id: 'week_schedule', label: 'Week Schedule', icon: 'calendar' },
      ],
      jobBoard: {
        activeListings: activeJobListings,
      },
    };
  }

  async createBusiness(
    userId: string,
    dto: CreateBusinessDto,
    files?: {
      profilePhoto?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
    },
  ) {
    // Check if business already exists
    const existing = await this.prisma.business.findFirst({
      where: {
        name: dto.name,
        ownerId: userId,
      },
    });

    if (existing) {
      throw new ConflictException('Business with this name already exists');
    }

    const profilePhoto = files?.profilePhoto?.[0];
    const coverPhoto = files?.coverPhoto?.[0];
    this.validateUploadedImages([profilePhoto, coverPhoto].filter(Boolean) as Express.Multer.File[]);
    const profileImage = profilePhoto ? `/uploads/businesses/${profilePhoto.filename}` : undefined;
    const coverImage = coverPhoto ? `/uploads/businesses/${coverPhoto.filename}` : undefined;
    const location = dto.location ? this.parseJson(dto.location, 'location') : undefined;
    const socialMedia = dto.socialMedia ? this.parseJson(dto.socialMedia, 'socialMedia') : undefined;
    const logo = dto.logo || profileImage;

    const business = await this.prisma.business.create({
      data: {
        name: dto.name,
        type: dto.type,
        logo,
        profileImage,
        coverImage,
        address: dto.address,
        phoneNumber: dto.phoneNumber,
        description: dto.description,
        location: location as any,
        socialMedia: socialMedia as any,
        ownerId: userId,
      },
    });

    // Also add user to this business
    await this.prisma.userBusiness.create({
      data: {
        userId,
        businessId: business.id,
        isSelected: true,
      },
    });

    return {
      message: 'Business created successfully',
      business,
    };
  }

  async getUserBusinesses(userId: string) {
    const userBusinesses = await this.prisma.userBusiness.findMany({
      where: { userId },
      include: {
        business: true,
      },
    });

    return userBusinesses.map(ub => ({
      id: ub.business.id,
      name: ub.business.name,
      type: ub.business.type,
      logo: ub.business.logo,
      isSelected: ub.isSelected,
    }));
  }

  async selectBusinesses(userId: string, dto: SelectBusinessDto) {
    // Deselect all first
    await this.prisma.userBusiness.updateMany({
      where: { userId },
      data: { isSelected: false },
    });

    // Select specified businesses
    await this.prisma.userBusiness.updateMany({
      where: {
        userId,
        businessId: { in: dto.businessIds },
      },
      data: { isSelected: true },
    });

    return {
      message: 'Businesses selected successfully',
      selectedCount: dto.businessIds.length,
    };
  }

  // ==================== SHIFT MANAGEMENT ====================

  async createShift(userId: string, dto: CreateShiftDto) {
    const shift = await this.prisma.shift.create({
      data: {
        userId,
        businessId: dto.businessId,
        title: dto.title,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        location: dto.location,
        hourlyRate: dto.hourlyRate,
        notes: dto.notes,
        status: 'scheduled',
      },
      include: {
        business: true,
      },
    });

    return {
      message: 'Shift created successfully',
      shift: this.formatShift(shift),
    };
  }

  async getUserShifts(userId: string, query: DashboardQueryDto) {
    const where: any = { userId };

    if (query.businessId) {
      where.businessId = query.businessId;
    }

    if (query.date) {
      const date = new Date(query.date);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      include: {
        business: true,
        attendance: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return shifts.map(shift => this.formatShift(shift));
  }

  async clockIn(userId: string, dto: ClockInDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.userId !== userId) {
      throw new BadRequestException('This shift does not belong to you');
    }

    // Check if already clocked in
    const existing = await this.prisma.attendance.findFirst({
      where: {
        shiftId: dto.shiftId,
        clockOut: null,
      },
    });

    if (existing) {
      throw new ConflictException('Already clocked in for this shift');
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        shiftId: dto.shiftId,
        clockIn: new Date(dto.clockInTime),
        clockInLocation: dto.location as any,
      },
    });

    // Update shift status
    await this.prisma.shift.update({
      where: { id: dto.shiftId },
      data: { status: 'ongoing' },
    });

    return {
      message: 'Clocked in successfully',
      attendance,
    };
  }

  async clockOut(userId: string, dto: ClockOutDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.userId !== userId) {
      throw new BadRequestException('This shift does not belong to you');
    }

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        shiftId: dto.shiftId,
        clockOut: null,
      },
    });

    if (!attendance) {
      throw new BadRequestException('No active clock-in found for this shift');
    }

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: new Date(dto.clockOutTime),
      },
    });

    // Calculate hours worked
    const clockIn = new Date(attendance.clockIn);
    const clockOut = new Date(dto.clockOutTime);
    const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    // Update shift status
    await this.prisma.shift.update({
      where: { id: dto.shiftId },
      data: { 
        status: 'completed',
        actualHours: hoursWorked,
      },
    });

    return {
      message: 'Clocked out successfully',
      attendance: updatedAttendance,
      hoursWorked: hoursWorked.toFixed(2),
    };
  }

  // ==================== WORK INSIGHTS ====================

  async getWorkInsights(userId: string, query: WorkInsightsQueryDto) {
    const [year, month] = query.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.businessId && { businessId: query.businessId }),
      },
      include: {
        attendance: true,
      },
    });

    const completedShifts = shifts.filter(s => s.status === 'completed');
    const totalTasks = completedShifts.length;
    const totalHours = completedShifts.reduce((sum, shift) => sum + (shift.actualHours || 0), 0);

    // Calculate performance score (mock calculation)
    const performanceScore = totalTasks > 0 ? Math.min(100, (totalTasks / 20) * 100) : 0;
    const performanceStatus = performanceScore >= 80 ? 'High Performance' : 
                             performanceScore >= 50 ? 'Medium' : 'Low';

    return {
      month: query.month,
      completed: {
        label: 'Completed',
        value: totalTasks,
        unit: 'Tasks',
      },
      worked: {
        label: 'Worked',
        value: Math.round(totalHours),
        unit: 'Hours',
      },
      performanceStatus: {
        label: 'Performance Status',
        value: `${Math.round(performanceScore)}%`,
        status: performanceStatus,
        trend: 'up',
      },
    };
  }

  // ==================== ENGAGEMENT & PERKS ====================

  async getEngagementStats(userId: string) {
    const engagements = await this.prisma.engagement.findMany({
      where: { userId },
    });

    const totalPoints = engagements.reduce((sum, e) => sum + e.points, 0);
    const referralPercentage = 12; // Mock data

    return {
      totalPoints,
      referralPercentage,
      activities: [
        {
          type: 'referral',
          title: "Let's Start Earning Your First Referral!",
          points: 50,
          action: 'How to Earn',
        },
      ],
    };
  }

  async recordEngagement(userId: string, dto: RecordEngagementDto) {
    const engagement = await this.prisma.engagement.create({
      data: {
        userId,
        type: dto.type,
        points: dto.points,
        description: dto.description,
      },
    });

    return {
      message: 'Engagement recorded successfully',
      engagement,
    };
  }

  // ==================== LEAVE MANAGEMENT ====================

  async requestLeave(userId: string, dto: RequestLeaveDto) {
    const leave = await this.prisma.leaveRequest.create({
      data: {
        userId,
        businessId: dto.businessId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        type: dto.type,
        reason: dto.reason,
        status: 'pending',
      },
    });

    return {
      message: 'Leave request submitted successfully',
      leave,
    };
  }

  // ==================== SWAP REQUESTS ====================

  async createSwapRequest(userId: string, dto: CreateSwapRequestDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.userId !== userId) {
      throw new BadRequestException('You can only swap your own shifts');
    }

    const swapRequest = await this.prisma.swapRequest.create({
      data: {
        shiftId: dto.shiftId,
        requestedBy: userId,
        swapWithUserId: dto.swapWithUserId,
        reason: dto.reason,
        status: 'pending',
      },
    });

    return {
      message: 'Swap request created successfully',
      swapRequest,
    };
  }

  // ==================== ROLE MANAGEMENT ====================

  async getRoles(userId: string, businessId: string) {
    const business = await this.getOwnedBusiness(userId, businessId);

    const roles = await this.prisma.role.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions,
      isPredefined: role.isPredefined,
    }));
  }

  async getRolesCatalog(userId: string, businessId: string) {
    await this.getOwnedBusiness(userId, businessId);

    const catalog = await this.getRolePermissionsCatalog();
    return {
      predefinedRoles: Object.values(UserRole).map((role) => ({
        id: role,
        label: role
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
      })),
      ...catalog,
    };
  }

  private async buildSectionedPermissionsFromRole(role: UserRole) {
    const catalog = await this.getRolePermissionsCatalog();
    const permissionToSection = new Map<string, string>();

    for (const section of catalog.sections) {
      for (const permission of section.permissions) {
        permissionToSection.set(permission.id, section.id);
      }
    }

    const sectioned: Record<string, string[]> = {};
    const permissions = ROLE_PERMISSIONS[role] || [];
    for (const permission of permissions) {
      const sectionId = permissionToSection.get(permission);
      if (!sectionId) continue;
      if (!sectioned[sectionId]) sectioned[sectionId] = [];
      sectioned[sectionId].push(permission);
    }

    for (const [sectionId, actions] of Object.entries(sectioned)) {
      sectioned[sectionId] = Array.from(new Set(actions)).sort();
    }

    return sectioned;
  }

  async createPredefinedRole(userId: string, dto: CreatePredefinedRoleDto) {
    const business = await this.getOwnedBusiness(userId, dto.businessId);

    const name = dto.role
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const existing = await this.prisma.role.findFirst({
      where: { businessId: business.id, name },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    const permissions = await this.buildSectionedPermissionsFromRole(dto.role);
    await this.validatePermissionsInput(permissions);

    const role = await this.prisma.role.create({
      data: {
        businessId: business.id,
        name,
        permissions: permissions as any,
        isPredefined: true,
      },
    });

    return {
      message: 'Role created successfully',
      role,
    };
  }

  private async getRolePermissionsCatalog() {
    const sections = await this.prisma.permissionSection.findMany({
      include: {
        permissions: {
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    return {
      sections: sections.map(section => ({
        id: section.code,
        title: section.title,
        permissions: section.permissions.map(permission => ({
          id: permission.code,
          label: permission.label,
        })),
      })),
    };
  }

  private async getAllowedPermissions() {
    const catalog = await this.getRolePermissionsCatalog();
    const allowed = new Map<string, Set<string>>();
    for (const section of catalog.sections) {
      allowed.set(
        section.id,
        new Set(section.permissions.map(permission => permission.id)),
      );
    }
    return allowed;
  }

  private normalizePermissionSectionId(sectionId: string) {
    const map: Record<string, string> = {
      businessOverview: 'business_overview',
      peopleManagement: 'people_management',
      jobManagement: 'job_management',
      shiftSchedule: 'shift_schedule',
      leaveManagement: 'leave_management',
      overtimeManagement: 'overtime_management',
      swapRequests: 'swap_requests',
      shiftOperations: 'shift_operations',
      attendanceHours: 'attendance_hours',
      businessManagement: 'business_management',
    };
    return map[sectionId] || sectionId;
  }

  private async validatePermissionsInput(permissions?: Record<string, string[]>) {
    if (!permissions) return;
    const allowed = await this.getAllowedPermissions();
    if (allowed.size === 0) {
      return;
    }

    for (const [rawSectionId, actions] of Object.entries(permissions)) {
      const sectionId = this.normalizePermissionSectionId(rawSectionId);
      const allowedActions = allowed.get(sectionId);
      if (!allowedActions) {
        throw new BadRequestException(`Invalid permission section: ${rawSectionId}`);
      }
      if (!Array.isArray(actions)) {
        throw new BadRequestException(`Permissions for ${rawSectionId} must be an array`);
      }
      for (const action of actions) {
        if (!allowedActions.has(action)) {
          throw new BadRequestException(`Invalid permission: ${rawSectionId}.${action}`);
        }
      }
    }
  }

  async createRole(userId: string, dto: CreateRoleDto) {
    const business = await this.getOwnedBusiness(userId, dto.businessId);

    const existing = await this.prisma.role.findFirst({
      where: { businessId: business.id, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    await this.validatePermissionsInput(dto.permissions);

    const role = await this.prisma.role.create({
      data: {
        businessId: business.id,
        name: dto.name,
        permissions: dto.permissions as any,
        isPredefined: dto.isPredefined || false,
      },
    });

    return {
      message: 'Role created successfully',
      role,
    };
  }

  async getRole(userId: string, roleId: string) {
    const role = await this.getOwnedRole(userId, roleId);
    return {
      id: role.id,
      name: role.name,
      permissions: role.permissions,
      isPredefined: role.isPredefined,
    };
  }

  async updateRole(userId: string, roleId: string, dto: UpdateRoleDto) {
    const role = await this.getOwnedRole(userId, roleId);

    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findFirst({
        where: { businessId: role.businessId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    await this.validatePermissionsInput(dto.permissions);

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.permissions && { permissions: dto.permissions as any }),
      },
    });

    return {
      message: 'Role updated successfully',
      role: updated,
    };
  }

  async deleteRole(userId: string, roleId: string) {
    const role = await this.getOwnedRole(userId, roleId);
    await this.prisma.role.delete({ where: { id: role.id } });
    return { message: 'Role deleted successfully' };
  }

  // ==================== HELPER METHODS ====================

  private formatShift(shift: any) {
    return {
      id: shift.id,
      title: shift.title,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      business: {
        id: shift.business.id,
        name: shift.business.name,
        logo: shift.business.logo,
      },
      location: shift.location,
      hourlyRate: shift.hourlyRate,
      earnings: shift.hourlyRate && shift.actualHours 
        ? `$${(shift.hourlyRate * shift.actualHours).toFixed(2)}`
        : null,
      attendance: shift.attendance ? {
        clockIn: shift.attendance.clockIn,
        clockOut: shift.attendance.clockOut,
      } : null,
    };
  }

  private formatRecentShiftSummary(shifts: any[]) {
    if (shifts.length === 0) return null;

    const latestShift = shifts[0];
    const totalHours = shifts.reduce((sum, s) => sum + (s.actualHours || 0), 0);
    
    return {
      date: latestShift.startTime,
      hours: `${totalHours.toFixed(1)} hours`,
      rating: 4.5, // Mock rating
      earnings: latestShift.hourlyRate 
        ? `$${(latestShift.hourlyRate * (latestShift.actualHours || 0)).toFixed(2)}`
        : null,
    };
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  private async checkIfHoliday(date: Date): Promise<boolean> {
    // Implement holiday checking logic
    // This could check against a holidays table or external API
    return false;
  }

  private parseJson(value: string, fieldName: string) {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new BadRequestException(`Invalid ${fieldName} JSON`);
    }
  }

  private validateUploadedImages(files: Express.Multer.File[]) {
    if (!files.length) return;
    const maxBytes = 1 * 1024 * 1024;
    const invalid = files.find(file => file.size > maxBytes);
    if (!invalid) return;

    for (const file of files) {
      const filePath = path.join(process.cwd(), 'uploads', 'businesses', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    throw new BadRequestException('Uploaded images must be 1MB or smaller');
  }

  private async getOwnedBusiness(userId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  private async getOwnedRole(userId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.getOwnedBusiness(userId, role.businessId);
    return role;
  }

  private formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildTrendDays(start: Date, end: Date) {
    const days: string[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (current <= last) {
      days.push(this.formatDateKey(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  private buildTopPerformers(shifts: any[], employeeCount: number) {
    if (!employeeCount) {
      return [];
    }
    const totals = new Map<string, { user: any; hours: number }>();
    for (const shift of shifts) {
      if (!shift.user || !shift.actualHours) continue;
      const existing = totals.get(shift.userId) || { user: shift.user, hours: 0 };
      existing.hours += shift.actualHours;
      totals.set(shift.userId, existing);
    }
    return Array.from(totals.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.user.id,
        name: entry.user.fullName,
        profileImage: entry.user.profileImage,
        hours: Math.round(entry.hours * 10) / 10,
      }));
  }

 private async calculateProfileCompletion(userId: string): Promise<number> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  let completion = 0;
  const totalFields = 5; // Update this based on how many fields you want to check
  
  if (user?.fullName) completion += 20;
  if (user?.email && user?.isVerified) completion += 20;
  if (user?.profileImage) completion += 20;
  if (user?.profile?.bio) completion += 20;
  // Remove or adjust the dateOfBirth check if you don't have that field
  
  return completion;
}
}
