// workforce.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  async createBusiness(userId: string, dto: CreateBusinessDto) {
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

    const business = await this.prisma.business.create({
      data: {
        name: dto.name,
        type: dto.type,
        logo: dto.logo,
        address: dto.address,
        description: dto.description,
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