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
import {
  AssignRoleDto,
  CreatePredefinedRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './dto/roles.dto';
import { ROLE_PERMISSIONS, UserRole } from './enums/roles.enum';

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
        subtitle: "No shift — it's a holiday!",
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
    const trendMap = new Map<string, { date: string; completed: number; missed: number }>(
      trendDays.map(
        (day): [string, { date: string; completed: number; missed: number }] => [
          day,
          { date: day, completed: 0, missed: 0 },
        ],
      ),
    );
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
    const profileImage = profilePhoto?.filename
      ? `/uploads/businesses/${profilePhoto.filename}`
      : undefined;
    const coverImage = coverPhoto?.filename
      ? `/uploads/businesses/${coverPhoto.filename}`
      : undefined;
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
        role: 'owner',
        isSelected: true,
      },
    });

    return {
      message: 'Business created successfully',
      business,
      role: 'owner',
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
      createdAt: role.createdAt,
    }));
  }

  async getRolesCatalog(userId: string, businessId: string) {
    await this.getOwnedBusiness(userId, businessId);

    const catalog = await this.getRolePermissionsCatalog();
    const roles = await this.prisma.role.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      predefinedRoles: Object.values(UserRole).map(role => ({
        id: role,
        label: this.formatRoleName(role),
      })),
      customRoles: roles.map(role => ({
        id: role.id,
        name: role.name,
        isPredefined: role.isPredefined,
        permissions: role.permissions,
      })),
      permissionSections: catalog.sections,
    };
  }

  async createPredefinedRole(userId: string, dto: CreatePredefinedRoleDto) {
    const business = await this.getOwnedBusiness(userId, dto.businessId);

    const normalizedRole = this.normalizeRoleCode(dto.role);
    const isKnownRole = Object.values(UserRole).includes(normalizedRole as UserRole);
    const name = isKnownRole
      ? this.formatRoleName(normalizedRole as UserRole)
      : this.formatCustomRoleName(dto.role);

    const existing = await this.prisma.role.findFirst({
      where: {
        businessId: business.id,
        name,
      },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    const permissions = isKnownRole
      ? await this.buildSectionedPermissionsFromRole(normalizedRole as UserRole)
      : {};
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
      role: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        isPredefined: role.isPredefined,
      },
    };
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
      role: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        isPredefined: role.isPredefined,
      },
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
      role: {
        id: updated.id,
        name: updated.name,
        permissions: updated.permissions,
        isPredefined: updated.isPredefined,
      },
    };
  }

  async deleteRole(userId: string, roleId: string) {
    const role = await this.getOwnedRole(userId, roleId);

    const usersWithRole = await this.prisma.userBusiness.count({
      where: {
        businessId: role.businessId,
        role: role.name,
      },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role that is assigned to ${usersWithRole} user(s)`,
      );
    }

    await this.prisma.role.delete({ where: { id: role.id } });

    return { message: 'Role deleted successfully' };
  }

  async assignRoleToUser(ownerId: string, dto: AssignRoleDto) {
    const business = await this.getOwnedBusiness(ownerId, dto.businessId);

    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        businessId: business.id,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const userBusiness = await this.prisma.userBusiness.findFirst({
      where: {
        userId: dto.userId,
        businessId: dto.businessId,
      },
    });

    if (!userBusiness) {
      throw new NotFoundException('User is not part of this business');
    }

    await this.prisma.userBusiness.update({
      where: { id: userBusiness.id },
      data: { role: role.name },
    });

    return {
      message: 'Role assigned successfully',
      user: {
        userId: dto.userId,
        role: role.name,
        businessId: dto.businessId,
      },
    };
  }

  // ==================== ROLE PERMISSIONS ====================

  async updateRolePermissions(
    userId: string,
    roleIdentifier: string,
    dto: UpdateRolePermissionsDto,
  ) {
    let role = await this.prisma.role.findUnique({
      where: { id: roleIdentifier },
    });

    if (!role && dto.businessId) {
      const normalized = this.normalizeRoleCode(roleIdentifier);
      const candidates = new Set<string>([
        roleIdentifier,
        this.formatCustomRoleName(roleIdentifier),
      ]);

      if (Object.values(UserRole).includes(normalized as UserRole)) {
        candidates.add(this.formatRoleName(normalized as UserRole));
      }

      role = await this.prisma.role.findFirst({
        where: {
          businessId: dto.businessId,
          name: { in: Array.from(candidates), mode: 'insensitive' },
        },
      });
    }

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.getOwnedBusiness(userId, role.businessId);
    await this.validatePermissionsInput(dto.permissions);

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: { permissions: dto.permissions as any },
    });

    return {
      message: 'Role permissions updated successfully',
      role: {
        id: updated.id,
        name: updated.name,
        permissions: updated.permissions,
        isPredefined: updated.isPredefined,
      },
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

  async requestLeave(userId: string, dto: WorkforceRequestLeaveDto) {
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

  async createSwapRequest(userId: string, dto: WorkforceCreateSwapRequestDto) {
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

private getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

private async calculateProfileCompletion(userId: string): Promise<number> {
  const profile = await this.prisma.profile.findUnique({
    where: { userId },
    select: { profileProgress: true },
  });

  return profile?.profileProgress ?? 0;
}

private async checkIfHoliday(date: Date): Promise<boolean> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const holiday = await this.prisma.holiday.findFirst({
    where: {
      date: {
        gte: start,
        lt: end,
      },
    },
    select: { id: true },
  });

  return Boolean(holiday);
}

private formatShift(shift: any) {
  const hourlyRate = typeof shift?.hourlyRate === 'number' ? shift.hourlyRate : null;
  const actualHours = typeof shift?.actualHours === 'number' ? shift.actualHours : null;

  return {
    id: shift?.id,
    title: shift?.title,
    startTime: shift?.startTime,
    endTime: shift?.endTime,
    status: shift?.status,
    business: shift?.business
      ? {
          id: shift.business.id,
          name: shift.business.name,
          logo: shift.business.logo,
        }
      : undefined,
    location: shift?.location ?? null,
    hourlyRate,
    actualHours,
    earnings:
      hourlyRate !== null && actualHours !== null
        ? `$${(hourlyRate * actualHours).toFixed(2)}`
        : null,
    attendance: shift?.attendance
      ? {
          clockIn: shift.attendance.clockIn,
          clockOut: shift.attendance.clockOut,
        }
      : null,
  };
}

private formatRecentShiftSummary(shifts: any[]) {
  if (!Array.isArray(shifts) || shifts.length === 0) return null;

  const totalHours = shifts.reduce((sum, shift) => {
    const hours = typeof shift?.actualHours === 'number' ? shift.actualHours : 0;
    return sum + hours;
  }, 0);

  const latestShift = shifts[0];
  const hourlyRate =
    latestShift && typeof latestShift.hourlyRate === 'number'
      ? latestShift.hourlyRate
      : null;
  const latestHours =
    latestShift && typeof latestShift.actualHours === 'number'
      ? latestShift.actualHours
      : null;

  return {
    date: latestShift?.startTime ?? null,
    hours: `${totalHours.toFixed(1)} hours`,
    rating: 4.5,
    earnings:
      hourlyRate !== null && latestHours !== null
        ? `$${(hourlyRate * latestHours).toFixed(2)}`
        : null,
  };
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
  if (!employeeCount || !Array.isArray(shifts) || shifts.length === 0) {
    return [];
  }

  const totals = new Map<string, { user: any; hours: number }>();
  for (const shift of shifts) {
    if (!shift?.userId || !shift?.user) continue;
    const hours = typeof shift.actualHours === 'number' ? shift.actualHours : 0;
    if (hours <= 0) continue;

    const existing = totals.get(shift.userId) || { user: shift.user, hours: 0 };
    existing.hours += hours;
    totals.set(shift.userId, existing);
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1].hours - a[1].hours)
    .slice(0, 3)
    .map(([userId, data], index) => ({
      rank: index + 1,
      userId,
      name: data.user?.fullName ?? null,
      profileImage: data.user?.profileImage ?? null,
      hours: Math.round(data.hours * 10) / 10,
    }));
}

  private formatRoleName(role: UserRole): string {
    const displayNames: Record<UserRole, string> = {
      [UserRole.OWNER]: 'Owner',
      [UserRole.MANAGER]: 'Manager',
      [UserRole.EMPLOYEE]: 'Employee',
      [UserRole.HR_RECRUITER]: 'HR / Recruiter',
      [UserRole.SHIFT_SUPERVISOR]: 'Shift Supervisor',
      [UserRole.AUDITOR]: 'Auditor',
      [UserRole.TRAINER]: 'Trainer',
    };

    return displayNames[role] || role;
  }

  private normalizeRoleCode(role: string): string {
    return role
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private formatCustomRoleName(role: string): string {
    const trimmed = role.trim();
    if (!trimmed) return trimmed;

    if (/[A-Z]/.test(trimmed)) {
      return trimmed;
    }

    return trimmed
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
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

  private async buildSectionedPermissionsFromRole(role: UserRole) {
    const catalog = await this.getRolePermissionsCatalog();
    const permissionToSection = new Map<string, string>();

    for (const section of catalog.sections) {
      for (const permission of section.permissions) {
        permissionToSection.set(permission.id, section.id);
      }
    }

    const sectioned: Record<string, Record<string, boolean>> = {};
    const permissions = ROLE_PERMISSIONS[role] || [];

    for (const permission of permissions) {
      const sectionId = permissionToSection.get(permission);
      if (!sectionId) continue;

      if (!sectioned[sectionId]) {
        sectioned[sectionId] = {};
      }

      sectioned[sectionId][permission] = true;
    }

    return sectioned;
  }

  private async validatePermissionsInput(
    permissions?: Record<string, Record<string, boolean>>,
  ) {
    if (!permissions) return;

    const catalog = await this.getRolePermissionsCatalog();
    const allowedSections = new Map<string, Set<string>>();

    for (const section of catalog.sections) {
      allowedSections.set(
        section.id,
        new Set(section.permissions.map(p => p.id)),
      );
    }

    for (const [sectionId, sectionPerms] of Object.entries(permissions)) {
      const normalizedSectionId = this.normalizeSectionId(sectionId);
      const allowedPerms = allowedSections.get(normalizedSectionId);

      if (!allowedPerms) {
        throw new BadRequestException(`Invalid permission section: ${sectionId}`);
      }

      for (const [permCode, enabled] of Object.entries(sectionPerms)) {
        if (typeof enabled !== 'boolean') {
          throw new BadRequestException(
            `Permission value must be boolean for ${sectionId}.${permCode}`,
          );
        }

        if (!allowedPerms.has(permCode)) {
          throw new BadRequestException(
            `Invalid permission: ${sectionId}.${permCode}`,
          );
        }
      }
    }
  }

  private normalizeSectionId(sectionId: string): string {
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

  private async getOwnedBusiness(userId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId },
    });

    if (!business) {
      throw new NotFoundException(
        'Business not found or you do not have permission',
      );
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

  private validateUploadedImages(files: Express.Multer.File[]) {
  const maxBytes = 5 * 1024 * 1024; // 5MB

  for (const file of files) {
    if (!file) continue;
    if (file.size > maxBytes) {
      throw new BadRequestException('Uploaded images must be 5MB or smaller');
    }
    if (!file.mimetype?.match(/\/(jpg|jpeg|png|gif)$/)) {
      throw new BadRequestException('Only image files are allowed');
    }
  }
  }

  private parseJson(value: string, fieldName: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new BadRequestException(`Invalid JSON for ${fieldName}`);
  }
  }
}
