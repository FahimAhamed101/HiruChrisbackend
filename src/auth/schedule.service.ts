// schedule.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GetScheduleDto,
  RequestShiftLeaveDto,
  ApproveLeaveDto,
  RequestOvertimeDto,
  ReportIssueDto,
  SubmitShiftSummaryDto,
  AssignShiftDto,
  MessageManagerDto,
  ShiftStatusEnum,
} from './dto/schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // ==================== GET SCHEDULE ====================

  async getWeeklySchedule(userId: string, dto: GetScheduleDto) {
    const targetDate = dto.date ? new Date(dto.date) : new Date();
    
    // Get start and end of the week
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const where: any = {
      userId,
      startTime: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    };

    if (dto.businessId) {
      where.businessId = dto.businessId;
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      include: {
        business: true,
        attendance: true,
        shiftLeave: true,
        assignedBy: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Check for holidays
    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
      shifts: shifts.map(shift => this.formatShiftForSchedule(shift)),
      holidays: holidays.map(h => ({
        date: h.date,
        name: h.name,
        description: h.description,
      })),
    };
  }

  async getDailySchedule(userId: string, date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Check if it's a holiday
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const shifts = await this.prisma.shift.findMany({
      where: {
        userId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        business: true,
        attendance: true,
        shiftLeave: true,
        assignedBy: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      date: targetDate,
      isHoliday: !!holiday,
      holiday: holiday ? {
        name: holiday.name,
        description: holiday.description,
      } : null,
      shifts: shifts.map(shift => this.formatShiftForSchedule(shift)),
    };
  }

  async getShiftDetail(userId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        business: true,
        attendance: true,
        shiftLeave: true,
        assignedBy: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.userId !== userId) {
      throw new BadRequestException('This shift does not belong to you');
    }

    // Calculate time until shift starts
    const now = new Date();
    const shiftStart = new Date(shift.startTime);
    const timeUntilStart = shiftStart.getTime() - now.getTime();
    
    const hoursUntil = Math.floor(timeUntilStart / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
    const secondsUntil = Math.floor((timeUntilStart % (1000 * 60)) / 1000);

    return {
      ...this.formatShiftForSchedule(shift),
      countdown: timeUntilStart > 0 ? {
        hours: hoursUntil,
        minutes: minutesUntil,
        seconds: secondsUntil,
        total: timeUntilStart,
      } : null,
      description: shift.notes,
      importantNotes: [
        'Physical stamina is required',
        'Cleanliness and hygiene are non-negotiable',
        'Willingness to assist in multiple tasks',
      ],
    };
  }

  // ==================== LEAVE MANAGEMENT ====================

  async requestShiftLeave(userId: string, dto: RequestShiftLeaveDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: { business: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.userId !== userId) {
      throw new BadRequestException('This shift does not belong to you');
    }

    // Check if leave already requested
    const existingLeave = await this.prisma.shiftLeave.findFirst({
      where: {
        shiftId: dto.shiftId,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existingLeave) {
      throw new BadRequestException('Leave already requested for this shift');
    }

    const leave = await this.prisma.shiftLeave.create({
      data: {
        shiftId: dto.shiftId,
        userId,
        type: dto.type,
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

    // Update shift status
    await this.prisma.shift.update({
      where: { id: dto.shiftId },
      data: { status: ShiftStatusEnum.LEAVE_PENDING },
    });

    return {
      message: 'Leave request submitted successfully',
      leave: {
        id: leave.id,
        type: leave.type,
        status: leave.status,
        shift: {
          id: leave.shift.id,
          title: leave.shift.title,
          startTime: leave.shift.startTime,
          business: leave.shift.business.name,
        },
      },
    };
  }

 async approveLeave(managerId: string, dto: ApproveLeaveDto) {
  const leave = await this.prisma.shiftLeave.findUnique({
    where: { id: dto.leaveId },
    include: {
      shift: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  // Update leave status
  const updatedLeave = await this.prisma.shiftLeave.update({
    where: { id: dto.leaveId },
    data: {
      status: dto.approved ? 'approved' : 'rejected',
      approvedBy: managerId,
      approvedAt: new Date(),
      notes: dto.notes,
    },
  });

  // Update shift status
  await this.prisma.shift.update({
    where: { id: leave.shiftId },
    data: { 
      status: dto.approved 
        ? ShiftStatusEnum.LEAVE_APPROVED 
        : ShiftStatusEnum.UPCOMING 
    },
  });

  return {
    message: dto.approved ? 'Leave approved' : 'Leave rejected',
    leave: updatedLeave,
  };
}

  // ==================== OVERTIME ====================

  async requestOvertime(userId: string, dto: RequestOvertimeDto) {
    const overtime = await this.prisma.overtimeRequest.create({
      data: {
        userId,
        businessId: dto.businessId,
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
      message: 'Overtime request submitted successfully',
      overtime: {
        id: overtime.id,
        date: overtime.date,
        start: overtime.overtimeStart,
        end: overtime.overtimeEnd,
        status: overtime.status,
        business: overtime.business.name,
      },
    };
  }

  // ==================== ISSUE REPORTING ====================

  async reportIssue(userId: string, dto: ReportIssueDto) {
    const issue = await this.prisma.shiftIssue.create({
      data: {
        userId,
        shiftId: dto.shiftId,
        issueType: dto.issueType,
        description: dto.description,
        status: 'reported',
      },
    });

    return {
      message: 'Issue reported successfully',
      issue: {
        id: issue.id,
        type: issue.issueType,
        status: issue.status,
        reportedAt: issue.createdAt,
      },
    };
  }

  // ==================== SHIFT SUMMARY ====================

  async submitShiftSummary(userId: string, dto: SubmitShiftSummaryDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.userId !== userId) {
      throw new BadRequestException('This shift does not belong to you');
    }

    const summary = await this.prisma.shiftSummary.create({
      data: {
        shiftId: dto.shiftId,
        notes: dto.notes,
        attachments: dto.attachments || [],
      },
    });

    // Mark shift as completed
    await this.prisma.shift.update({
      where: { id: dto.shiftId },
      data: { status: ShiftStatusEnum.COMPLETED },
    });

    return {
      message: 'Shift summary submitted successfully',
      summary: {
        id: summary.id,
        notes: summary.notes,
        submittedAt: summary.createdAt,
      },
    };
  }

  // ==================== MESSAGING ====================

  async messageManager(userId: string, dto: MessageManagerDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: { business: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Create message record
    const message = await this.prisma.shiftMessage.create({
      data: {
        shiftId: dto.shiftId,
        senderId: userId,
        message: dto.message,
      },
    });

    return {
      message: 'Message sent to manager',
      messageId: message.id,
    };
  }

  // ==================== HELPER METHODS ====================

  private formatShiftForSchedule(shift: any) {
    const now = new Date();
    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.endTime);
    
    let status = shift.status;
    
    // Auto-determine status if not set
    if (!status || status === 'scheduled') {
      if (shift.shiftLeave?.status === 'pending') {
        status = ShiftStatusEnum.LEAVE_PENDING;
      } else if (shift.shiftLeave?.status === 'approved') {
        status = ShiftStatusEnum.LEAVE_APPROVED;
      } else if (now < shiftStart) {
        status = ShiftStatusEnum.UPCOMING;
      } else if (now >= shiftStart && now <= shiftEnd && shift.attendance?.clockIn && !shift.attendance?.clockOut) {
        status = ShiftStatusEnum.ONGOING;
      } else if (shift.attendance?.clockOut) {
        status = ShiftStatusEnum.COMPLETED;
      } else if (now > shiftEnd && !shift.attendance?.clockIn) {
        status = ShiftStatusEnum.MISSED;
      }
    }

    // Calculate earnings if applicable
    const earnings = this.calculateEarnings(shift);

    // Calculate time until/since shift
    const timeUntilStart = shiftStart.getTime() - now.getTime();
    const countdown = this.formatCountdown(timeUntilStart);

    return {
      id: shift.id,
      title: shift.title,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status,
      business: {
        id: shift.business.id,
        name: shift.business.name,
        logo: shift.business.logo,
      },
      location: shift.location,
      break: shift.break ? {
        start: shift.breakStart,
        end: shift.breakEnd,
      } : null,
      hourlyRate: shift.hourlyRate,
      earnings,
      countdown,
      attendance: shift.attendance ? {
        clockIn: shift.attendance.clockIn,
        clockOut: shift.attendance.clockOut,
      } : null,
      leave: shift.shiftLeave ? {
        id: shift.shiftLeave.id,
        type: shift.shiftLeave.type,
        status: shift.shiftLeave.status,
        reason: shift.shiftLeave.reason,
      } : null,
      assignedBy: shift.assignedBy ? {
        id: shift.assignedBy.id,
        name: shift.assignedBy.fullName,
        profileImage: shift.assignedBy.profileImage,
      } : null,
    };
  }

  private calculateEarnings(shift: any) {
    if (!shift.hourlyRate) return null;
    
    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.endTime);
    const hoursWorked = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
    
    return {
      amount: shift.hourlyRate * hoursWorked,
      hourlyRate: shift.hourlyRate,
      hoursWorked,
    };
  }

  private formatCountdown(milliseconds: number) {
    if (milliseconds <= 0) return null;
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return {
      hours,
      minutes,
      seconds,
      formatted: `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    };
  }
}
