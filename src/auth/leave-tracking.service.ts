// leave-tracking.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetLeaveHistoryDto,
  RequestLeaveDto,
  GetTrackHoursDto,
  GetAttendanceLogDto,
  GetOvertimeRequestsDto,
  CreateOvertimeRequestDto,
  RespondOvertimeDto,
  GetSwapRequestsDto,
  CreateSwapRequestDto,
  RespondSwapDto,
} from './dto/track-hours.dto';

@Injectable()
export class LeaveTrackingService {
  constructor(private prisma: PrismaService) {}

  // ==================== LEAVE HISTORY ====================

  async getLeaveHistory(userId: string, dto: GetLeaveHistoryDto) {
    const where: any = { userId };

    // Filter by month
    if (dto.month) {
      const [year, month] = dto.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      where.startDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Filter by status
    if (dto.status && dto.status !== 'all') {
      where.status = dto.status;
    }

    const leaves = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        business: true,
      },
      orderBy: { startDate: 'desc' },
    });

    // Get leave balance
    const leaveBalance = await this.getLeaveBalance(userId);

    return {
      leaves: leaves.map(leave => this.formatLeaveRequest(leave)),
      balance: leaveBalance,
    };
  }

  async requestLeave(userId: string, dto: RequestLeaveDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check leave balance
    const balance = await this.getLeaveBalance(userId);
    const leaveTypeBalance = balance[dto.leaveType];

    if (leaveTypeBalance !== undefined && leaveTypeBalance <= 0) {
      throw new BadRequestException(
        `You have only ${leaveTypeBalance} ${dto.leaveType.replace('_', ' ')} remaining this month`,
      );
    }

    // Create leave request
    const leave = await this.prisma.leaveRequest.create({
      data: {
        userId,
        businessId: dto.businessId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        halfDay: dto.halfDay || false,
        startTime: dto.startTime,
        endTime: dto.endTime,
        type: dto.leaveType,
        reason: dto.reason,
        status: 'pending',
      },
      include: {
        business: true,
      },
    });

    return {
      message: 'Leave request submitted successfully',
      leave: this.formatLeaveRequest(leave),
      balance: await this.getLeaveBalance(userId),
    };
  }

  private async getLeaveBalance(userId: string) {
    // Get current month's leave usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usedLeaves = await this.prisma.leaveRequest.groupBy({
      by: ['type'],
      where: {
        userId,
        status: { in: ['approved', 'pending'] },
        startDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _count: true,
    });

    const balance: any = {
      sick_leave: 5,
      personal_leave: 3,
      casual_leave: 5,
      emergency_leave: 2,
    };

    usedLeaves.forEach(leave => {
      if (balance[leave.type] !== undefined) {
        balance[leave.type] -= leave._count;
      }
    });

    return balance;
  }

  // ==================== TRACK HOURS ====================

  async getTrackHours(userId: string, dto: GetTrackHoursDto) {
    const month = dto.month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);

    const where: any = {
      userId,
      startTime: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    if (dto.businessId) {
      where.businessId = dto.businessId;
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      include: {
        attendance: true,
        business: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Calculate totals
    const totalHours = shifts.reduce((sum, shift) => {
      if (shift.actualHours) {
        return sum + shift.actualHours;
      }
      // Calculate from attendance if available
      if (shift.attendance?.clockIn && shift.attendance?.clockOut) {
        const hours = (new Date(shift.attendance.clockOut).getTime() - 
                      new Date(shift.attendance.clockIn).getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    const completedShifts = shifts.filter(s => s.status === 'completed').length;
    const overtimeHours = shifts.reduce((sum, shift) => {
      // Calculate overtime if worked beyond scheduled hours
      if (shift.actualHours && shift.attendance) {
        const scheduledHours = (new Date(shift.endTime).getTime() - 
                               new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
        const overtime = shift.actualHours - scheduledHours;
        return sum + (overtime > 0 ? overtime : 0);
      }
      return sum;
    }, 0);

    // Group shifts by date for daily log
    const dailyLog = this.groupShiftsByDate(shifts);

    // Work pattern (hours per day of week)
    const workPattern = this.calculateWorkPattern(shifts);

    return {
      overview: {
        totalHours: Math.round(totalHours * 100) / 100,
        completedShifts,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
      },
      dailyLog,
      workPattern,
    };
  }

  // ==================== ATTENDANCE LOG ====================

  async getAttendanceLog(userId: string, dto: GetAttendanceLogDto) {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(new Date().setDate(1));
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();

    const where: any = {
      userId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (dto.businessId) {
      where.businessId = dto.businessId;
    }

    const attendances = await this.prisma.shift.findMany({
      where: {
        ...where,
        attendance: { isNot: null },
      },
      include: {
        attendance: true,
        business: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return attendances.map(shift => {
      const clockIn = shift.attendance?.clockIn;
      const clockOut = shift.attendance?.clockOut;
      
      let workingTime = '00:00:00';
      let status = 'absent';

      if (clockIn && clockOut) {
        const duration = new Date(clockOut).getTime() - new Date(clockIn).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((duration % (1000 * 60)) / 1000);
        workingTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Check if overtime
        const scheduledDuration = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
        status = duration > scheduledDuration ? 'overtime' : 'present';
      } else if (clockIn && !clockOut) {
        status = 'late_entry';
      }

      return {
        date: shift.startTime,
        startTime: new Date(shift.startTime).toTimeString().slice(0, 5),
        endTime: new Date(shift.endTime).toTimeString().slice(0, 5),
        workingTime,
        status,
        business: {
          id: shift.business.id,
          name: shift.business.name,
          logo: shift.business.logo,
        },
        clockIn: clockIn ? new Date(clockIn).toTimeString().slice(0, 5) : null,
        clockOut: clockOut ? new Date(clockOut).toTimeString().slice(0, 5) : null,
      };
    });
  }

  // ==================== OVERTIME REQUESTS ====================

  async getOvertimeRequests(userId: string, dto: GetOvertimeRequestsDto) {
    const where: any = {};

    if (dto.type === 'send') {
      where.userId = userId;
    } else if (dto.type === 'received') {
      // Get overtime requests for shifts managed by this user
      where.shift = {
        assignedById: userId,
      };
    }

    if (dto.status && dto.status !== 'all') {
      where.status = dto.status;
    }

    const requests = await this.prisma.overtimeRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        business: true,
        shift: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map(req => ({
      id: req.id,
      title: req.shift?.title || 'Overtime Request',
      date: req.date,
      overtimeStart: req.overtimeStart,
      overtimeEnd: req.overtimeEnd,
      reason: req.reason,
      status: req.status,
      business: {
        id: req.business.id,
        name: req.business.name,
        logo: req.business.logo,
      },
      requestedBy: req.user,
      createdAt: req.createdAt,
    }));
  }

  async createOvertimeRequest(userId: string, dto: CreateOvertimeRequestDto) {
    const request = await this.prisma.overtimeRequest.create({
      data: {
        userId,
        businessId: dto.businessId,
        shiftId: dto.shiftId,
        date: new Date(dto.date),
        overtimeStart: dto.overtimeStart,
        overtimeEnd: dto.overtimeEnd,
        reason: dto.reason,
        status: 'pending',
      },
      include: {
        business: true,
      },
    });

    return {
      message: 'Overtime request sent successfully',
      request,
    };
  }

 async respondToOvertime(managerId: string, dto: RespondOvertimeDto) {
  const request = await this.prisma.overtimeRequest.findUnique({
    where: { id: dto.overtimeId },
    include: {
      business: true,
    },
  });

  if (!request) {
    throw new NotFoundException('Overtime request not found');
  }

  // ✅ FIXED: Verify manager has permission for this business
  const managerPermission = await this.prisma.userBusiness.findFirst({
    where: {
      userId: managerId,
      businessId: request.businessId,
      role: { in: ['manager', 'owner'] },
    },
  });

  if (!managerPermission) {
    throw new BadRequestException(
      'You do not have permission to respond to overtime requests for this business'
    );
  }

  const updated = await this.prisma.overtimeRequest.update({
    where: { id: dto.overtimeId },
    data: {
      status: dto.accepted ? 'accepted' : 'rejected',
      approvedBy: managerId,
      approvedAt: new Date(),
    },
  });

  return {
    message: dto.accepted ? 'Overtime request accepted' : 'Overtime request rejected',
    request: updated,
  };
}

  // ==================== SWAP REQUESTS ====================

  async getSwapRequests(userId: string, dto: GetSwapRequestsDto) {
    const where: any = {};

    if (dto.type === 'send') {
      where.requestedBy = userId;
    } else if (dto.type === 'received') {
      where.swapWithUserId = userId;
    } else {
      where.OR = [
        { requestedBy: userId },
        { swapWithUserId: userId },
      ];
    }

    if (dto.status && dto.status !== 'all') {
      where.status = dto.status;
    }

    const requests = await this.prisma.swapRequest.findMany({
      where,
      include: {
        shift: {
          include: {
            business: true,
          },
        },
        requester: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        swapWith: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map(req => ({
      id: req.id,
      shift: {
        id: req.shift.id,
        title: req.shift.title,
        date: req.shift.startTime,
        time: `${new Date(req.shift.startTime).toTimeString().slice(0, 5)} - ${new Date(req.shift.endTime).toTimeString().slice(0, 5)}`,
        break: req.shift.break ? `${req.shift.breakStart} - ${req.shift.breakEnd}` : null,
        location: req.shift.location,
      },
      business: req.shift.business,
      requestedBy: req.requester,
      swapWith: req.swapWith,
      reason: req.reason,
      status: req.status,
      createdAt: req.createdAt,
    }));
  }

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

    const request = await this.prisma.swapRequest.create({
      data: {
        shiftId: dto.shiftId,
        requestedBy: userId,
        swapWithUserId: dto.targetUserId,
        reason: dto.reason,
        status: 'pending',
      },
      include: {
        shift: {
          include: {
            business: true,
          },
        },
      },
    });

    return {
      message: 'Swap request sent successfully',
      request,
    };
  }

 async respondToSwap(userId: string, dto: RespondSwapDto) {
  const request = await this.prisma.swapRequest.findUnique({
    where: { id: dto.swapId },
    include: { 
      shift: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!request) {
    throw new NotFoundException('Swap request not found');
  }

  // ✅ FIXED: Check if user is the target of the swap OR a manager/owner
  const isTarget = request.swapWithUserId === userId;
  
  const isManager = await this.prisma.userBusiness.findFirst({
    where: {
      userId,
      businessId: request.shift.businessId,
      role: { in: ['manager', 'owner'] },
    },
  });

  if (!isTarget && !isManager) {
    throw new BadRequestException(
      'You do not have permission to respond to this swap request'
    );
  }

  const updated = await this.prisma.swapRequest.update({
    where: { id: dto.swapId },
    data: {
      status: dto.accepted ? 'accepted' : 'rejected',
      swapWithUserId: dto.accepted && isTarget ? userId : request.swapWithUserId,
    },
  });

  // If accepted and user is the target, swap the shift assignment
  if (dto.accepted && isTarget) {
    await this.prisma.shift.update({
      where: { id: request.shiftId },
      data: { userId: userId },
    });
  }

  return {
    message: dto.accepted ? 'Swap request accepted' : 'Swap request rejected',
    request: updated,
  };
}

  // ==================== HELPER METHODS ====================

  private formatLeaveRequest(leave: any) {
    return {
      id: leave.id,
      startDate: leave.startDate,
      endDate: leave.endDate,
      type: leave.type,
      reason: leave.reason,
      status: leave.status,
      halfDay: leave.halfDay,
      startTime: leave.startTime,
      endTime: leave.endTime,
      business: {
        id: leave.business.id,
        name: leave.business.name,
        logo: leave.business.logo,
      },
      rejectionReason: leave.status === 'rejected' ? 'Not enough staff available' : null,
      createdAt: leave.createdAt,
    };
  }

  private groupShiftsByDate(shifts: any[]) {
    const grouped = new Map();

    shifts.forEach(shift => {
      const date = new Date(shift.startTime).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date).push(shift);
    });

    return Array.from(grouped.entries()).map(([date, dayShifts]: [string, any[]]) => ({
      date: new Date(date),
      shifts: dayShifts.length,
      hours: dayShifts.reduce((sum, s) => sum + (s.actualHours || 0), 0),
      status: dayShifts.some(s => s.status === 'ongoing') ? 'on_shift' : 
              dayShifts.some(s => s.status === 'completed') ? 'completed' : 'upcoming',
    }));
  }

  private calculateWorkPattern(shifts: any[]) {
    const pattern = Array(7).fill(0);
    const counts = Array(7).fill(0);

    shifts.forEach(shift => {
      const dayOfWeek = new Date(shift.startTime).getDay();
      if (shift.actualHours) {
        pattern[dayOfWeek] += shift.actualHours;
        counts[dayOfWeek]++;
      }
    });

    return pattern.map((total, index) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      hours: counts[index] > 0 ? Math.round((total / counts[index]) * 100) / 100 : 0,
    }));
  }
}