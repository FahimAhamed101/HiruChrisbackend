// src/auth/leave-holiday.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Holiday } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetLeaveRequestsDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  CreateLeaveRequestDto,
  CreateHolidayDto,
  GetHolidaysDto,
  UpdateHolidayDto,
  ImportHolidaysDto,
  DeleteHolidayDto,
  GetCalendarDto,
  LeaveRequestStatus,
} from './dto/leave-holiday.dto';

@Injectable()
export class LeaveHolidayService {
  constructor(private prisma: PrismaService) {}

  // ==================== LEAVE REQUESTS (MANAGER VIEW) ====================

  async getLeaveRequests(userId: string, dto: GetLeaveRequestsDto) {
    // Get businesses where user is owner/manager
    const userBusinesses = await this.prisma.userBusiness.findMany({
      where: {
        userId,
        ...(dto.businessId && { businessId: dto.businessId }),
      },
      select: { businessId: true },
    });

    if (userBusinesses.length === 0) {
      throw new ForbiddenException('No access to this business');
    }

    const businessIds = userBusinesses.map(ub => ub.businessId);

    const where: any = {
      businessId: { in: businessIds },
    };

    // Filter by status (default to pending for "New Request" tab)
    if (dto.status) {
      where.status = dto.status;
    }

    // Filter by specific date if provided
    if (dto.date) {
      const targetDate = new Date(dto.date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      where.OR = [
        {
          AND: [
            { startDate: { lte: endOfDay } },
            { endDate: { gte: startOfDay } },
          ],
        },
      ];
    }

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { startDate: 'asc' },
      ],
    });

    // Group by date
    const grouped = this.groupLeaveRequestsByDate(leaveRequests);

    return {
      leaveRequests: grouped,
      stats: {
        total: leaveRequests.length,
        pending: leaveRequests.filter(lr => lr.status === 'pending').length,
        approved: leaveRequests.filter(lr => lr.status === 'approved').length,
        rejected: leaveRequests.filter(lr => lr.status === 'rejected').length,
      },
    };
  }

  async approveLeaveRequest(userId: string, dto: ApproveLeaveRequestDto) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: dto.leaveRequestId },
      include: {
        business: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Verify user has permission
    await this.verifyManagerAccess(userId, leaveRequest.businessId);

    // Update status
    const updated = await this.prisma.leaveRequest.update({
      where: { id: dto.leaveRequestId },
      data: {
        status: dto.approved ? 'approved' : 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        business: true,
      },
    });

    // TODO: Send notification to employee

    return {
      message: dto.approved ? 'Leave request approved' : 'Leave request rejected',
      leaveRequest: this.formatLeaveRequest(updated),
    };
  }

  async rejectLeaveRequest(userId: string, dto: RejectLeaveRequestDto) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: dto.leaveRequestId },
      include: { business: true },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Verify user has permission
    await this.verifyManagerAccess(userId, leaveRequest.businessId);

    // Update with rejection details
    const updated = await this.prisma.leaveRequest.update({
      where: { id: dto.leaveRequestId },
      data: {
        status: 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: dto.rejectionReason,
        rejectionCategory: dto.rejectionCategory,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        business: true,
      },
    });

    // TODO: Send notification to employee with reason

    return {
      message: 'Leave request rejected',
      leaveRequest: this.formatLeaveRequest(updated),
    };
  }

  // ==================== LEAVE REQUESTS (EMPLOYEE VIEW) ====================

  async createLeaveRequest(userId: string, dto: CreateLeaveRequestDto) {
    // Verify user has access to this business
    const userBusiness = await this.prisma.userBusiness.findFirst({
      where: {
        userId,
        businessId: dto.businessId,
      },
    });

    if (!userBusiness) {
      throw new BadRequestException('No access to this business');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check for overlapping leave requests
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        businessId: dto.businessId,
        status: { in: ['pending', 'approved'] },
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('You already have a leave request for this period');
    }

    // Create leave request
    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        userId,
        businessId: dto.businessId,
        startDate,
        endDate,
        type: dto.type,
        reason: dto.reason,
        halfDay: dto.halfDay || false,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: 'pending',
      },
      include: {
        business: true,
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

    // TODO: Send notification to manager

    return {
      message: 'Leave request submitted successfully',
      leaveRequest: this.formatLeaveRequest(leaveRequest),
    };
  }

  async getMyLeaveRequests(userId: string, businessId?: string) {
    const where: any = { userId };
    
    if (businessId) {
      where.businessId = businessId;
    }

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      leaveRequests: leaveRequests.map(lr => this.formatLeaveRequest(lr)),
    };
  }

  // ==================== HOLIDAYS ====================

  async createHoliday(userId: string, dto: CreateHolidayDto) {
    // If businessId provided, verify manager access
    if (dto.businessId) {
      await this.verifyManagerAccess(userId, dto.businessId);
    }

    // Check if holiday already exists for this date
    const existing = await this.prisma.holiday.findFirst({
      where: {
        date: new Date(dto.date),
        businessId: dto.businessId || null,
      },
    });

    if (existing) {
      throw new BadRequestException('A holiday already exists for this date');
    }

    const holiday = await this.prisma.holiday.create({
      data: {
        name: dto.title,
        date: new Date(dto.date),
        description: dto.description,
        businessId: dto.businessId,
        type: dto.type,
        appliesTo: dto.appliesTo,
      },
    });

    return {
      message: 'Holiday created successfully',
      holiday: this.formatHoliday(holiday),
    };
  }

  async getHolidays(userId: string, dto: GetHolidaysDto) {
    const where: any = {};

    // Get user's businesses
    let businessIds: string[] = [];
    if (dto.businessId) {
      businessIds = [dto.businessId];
    } else {
      const userBusinesses = await this.prisma.userBusiness.findMany({
        where: { userId },
        select: { businessId: true },
      });
      businessIds = userBusinesses.map(ub => ub.businessId);
    }

    // Filter by date range
    if (dto.month) {
      const [year, month] = dto.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (dto.year) {
      const year = parseInt(dto.year);
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get holidays (both business-specific and global)
    where.OR = [
      { businessId: { in: businessIds } },
      { businessId: null }, // Global holidays
    ];

    const holidays = await this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return {
      holidays: holidays.map(h => this.formatHoliday(h)),
    };
  }

  async updateHoliday(userId: string, holidayId: string, dto: UpdateHolidayDto) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }

    // Verify permission if business-specific holiday
    if (holiday.businessId) {
      await this.verifyManagerAccess(userId, holiday.businessId);
    }

    const updated = await this.prisma.holiday.update({
      where: { id: holidayId },
      data: {
        ...(dto.title && { name: dto.title }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.type && { type: dto.type }),
        ...(dto.appliesTo && { appliesTo: dto.appliesTo }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return {
      message: 'Holiday updated successfully',
      holiday: this.formatHoliday(updated),
    };
  }

  async deleteHoliday(userId: string, dto: DeleteHolidayDto) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id: dto.holidayId },
    });

    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }

    // Verify permission if business-specific holiday
    if (holiday.businessId) {
      await this.verifyManagerAccess(userId, holiday.businessId);
    }

    await this.prisma.holiday.delete({
      where: { id: dto.holidayId },
    });

    return {
      message: 'Holiday deleted successfully',
      deletedId: dto.holidayId,
    };
  }

  async importHolidays(userId: string, dto: ImportHolidaysDto) {
    // Verify permission if businessId provided
    if (dto.businessId) {
      await this.verifyManagerAccess(userId, dto.businessId);
    }

    // Mock holiday data - in production, fetch from external API
    const mockHolidays = this.getMockHolidays(dto.countryCode, dto.year);

    // Filter by types if specified
    let holidaysToImport = mockHolidays;
    if (dto.types && dto.types.length > 0) {
      const allowedTypes = dto.types;
      holidaysToImport = mockHolidays.filter(h => allowedTypes.includes(h.type));
    }

    const created: Holiday[] = [];
    for (const holiday of holidaysToImport) {
      // Check if already exists
      const existing = await this.prisma.holiday.findFirst({
        where: {
          date: new Date(holiday.date),
          businessId: dto.businessId || null,
        },
      });

      if (!existing) {
        const newHoliday = await this.prisma.holiday.create({
          data: {
            name: holiday.name,
            date: new Date(holiday.date),
            description: holiday.description,
            type: holiday.type,
            appliesTo: 'all_employees',
            businessId: dto.businessId,
          },
        });
        created.push(newHoliday);
      }
    }

    return {
      message: `${created.length} holidays imported successfully`,
      imported: created.length,
      holidays: created.map(h => this.formatHoliday(h)),
    };
  }

  // ==================== CALENDAR ====================

  async getCalendar(userId: string, dto: GetCalendarDto) {
    const [year, month] = dto.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get user's businesses
    let businessIds: string[] = [];
    if (dto.businessId) {
      businessIds = [dto.businessId];
    } else {
      const userBusinesses = await this.prisma.userBusiness.findMany({
        where: { userId },
        select: { businessId: true },
      });
      businessIds = userBusinesses.map(ub => ub.businessId);
    }

    // Get holidays for this month
    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        OR: [
          { businessId: { in: businessIds } },
          { businessId: null },
        ],
      },
      orderBy: { date: 'asc' },
    });

    // Get leave requests for context
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        businessId: { in: businessIds },
        status: 'approved',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    // Build calendar data
    const calendarData = {
      month: dto.month,
      year: year.toString(),
      holidays: holidays.map(h => this.formatHoliday(h)),
      leaveCount: leaveRequests.length,
      daysWithEvents: this.getDaysWithEvents(holidays, leaveRequests),
    };

    return calendarData;
  }

  // ==================== HELPER METHODS ====================

  private groupLeaveRequestsByDate(leaveRequests: any[]) {
    const grouped = new Map<string, any[]>();

    leaveRequests.forEach(lr => {
      const dateKey = new Date(lr.startDate).toDateString();
      let requests = grouped.get(dateKey);
      if (!requests) {
        requests = [];
        grouped.set(dateKey, requests);
      }
      requests.push(this.formatLeaveRequest(lr));
    });

    return Array.from(grouped.entries()).map(([date, requests]) => ({
      date: new Date(date),
      displayDate: this.formatDisplayDate(new Date(date)),
      count: requests.length,
      requests,
    }));
  }

  private formatDisplayDate(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.getDate()}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow ${date.getDate()}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric' 
      });
    }
  }

  private formatLeaveRequest(lr: any) {
    return {
      id: lr.id,
      employee: {
        id: lr.user.id,
        name: lr.user.fullName,
        profileImage: lr.user.profileImage,
        role: 'Role - Department', // Would need to fetch from UserBusiness
      },
      startDate: lr.startDate,
      endDate: lr.endDate,
      displayDateRange: this.formatDateRange(lr.startDate, lr.endDate),
      type: lr.type,
      typeDisplay: this.formatLeaveType(lr.type),
      reason: lr.reason,
      status: lr.status,
      halfDay: lr.halfDay,
      timeRange: lr.halfDay ? `${lr.startTime} to ${lr.endTime}` : null,
      submittedOn: lr.createdAt,
      approvedBy: lr.approver ? {
        id: lr.approver.id,
        name: lr.approver.fullName,
      } : null,
      approvedAt: lr.approvedAt,
      rejectionReason: lr.rejectionReason,
      rejectionCategory: lr.rejectionCategory,
      business: lr.business ? {
        id: lr.business.id,
        name: lr.business.name,
      } : null,
    };
  }

  private formatLeaveType(type: string): string {
    const typeMap = {
      hourly_leave: 'Hourly Leave',
      sick_leave: 'Sick Leave',
      casual_leave: 'Casual Leave',
      earned_leave: 'Earned Leave',
      unpaid_leave: 'Unpaid Leave',
    };
    return typeMap[type] || type;
  }

  private formatDateRange(start: Date, end: Date): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return startDate.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  private formatHoliday(holiday: any) {
    const date = new Date(holiday.date);
    
    return {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      type: holiday.type,
      typeDisplay: this.formatHolidayType(holiday.type),
      appliesTo: holiday.appliesTo,
      description: holiday.description,
      businessId: holiday.businessId,
      isGlobal: !holiday.businessId,
    };
  }

  private formatHolidayType(type: string): string {
    const typeMap = {
      national: 'National',
      federal: 'Federal Holiday',
      religious: 'Religious',
      company: 'Company',
      other: 'Other',
    };
    return typeMap[type] || type;
  }

  private getDaysWithEvents(holidays: any[], leaveRequests: any[]) {
    const days = new Set<number>();
    
    holidays.forEach(h => {
      days.add(new Date(h.date).getDate());
    });
    
    leaveRequests.forEach(lr => {
      const start = new Date(lr.startDate);
      const end = new Date(lr.endDate);
      const current = new Date(start);
      
      while (current <= end) {
        days.add(current.getDate());
        current.setDate(current.getDate() + 1);
      }
    });
    
    return Array.from(days).sort((a, b) => a - b);
  }

  private async verifyManagerAccess(userId: string, businessId: string) {
    const access = await this.prisma.userBusiness.findFirst({
      where: {
        userId,
        businessId,
        role: { in: ['owner', 'manager'] },
      },
    });

    if (!access) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private getMockHolidays(countryCode: string, year: string) {
    // Mock data - in production, fetch from external API like holidayapi.com
    if (countryCode === 'US' && year === '2025') {
      return [
        {
          name: 'New Year\'s Day',
          date: '2025-01-01',
          type: 'national',
          description: 'Start of the new year',
        },
        {
          name: 'Martin Luther King Jr. Day',
          date: '2025-01-20',
          type: 'federal',
          description: 'Federal holiday',
        },
        {
          name: 'Presidents\' Day',
          date: '2025-02-17',
          type: 'federal',
          description: 'Federal holiday',
        },
        {
          name: 'Clean Monday',
          date: '2025-03-03',
          type: 'national',
          description: 'Holiday Type: National',
        },
        {
          name: 'Good Friday',
          date: '2025-03-30',
          type: 'national',
          description: 'Holiday Type: National',
        },
        {
          name: 'Memorial Day',
          date: '2025-05-26',
          type: 'federal',
          description: 'Federal holiday',
        },
        {
          name: 'Independence Day',
          date: '2025-07-04',
          type: 'national',
          description: 'National Independence Day',
        },
        {
          name: 'Labor Day',
          date: '2025-09-01',
          type: 'federal',
          description: 'Federal holiday',
        },
        {
          name: 'Thanksgiving',
          date: '2025-11-27',
          type: 'national',
          description: 'Thanksgiving Day',
        },
        {
          name: 'Christmas',
          date: '2025-12-25',
          type: 'national',
          description: 'Christmas Day',
        },
      ];
    }
    
    return [];
  }
}
