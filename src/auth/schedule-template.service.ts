// src/auth/schedule-template.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateWeeklyScheduleDto,
  GetWeeklyScheduleDto,
  AssignShiftDto,
  BulkAssignDto,
  UpdateShiftDto,
  DuplicateShiftDto,
  SearchShiftsDto,
  GetAvailableEmployeesDto,
  PreviewScheduleDto,
  GetScheduleStatsDto,
} from './dto/schedule-template.dto';

@Injectable()
export class ScheduleTemplateService {
  constructor(private prisma: PrismaService) {}

  // ==================== TEMPLATE MANAGEMENT ====================

  async createTemplate(userId: string, dto: CreateTemplateDto) {
    await this.verifyBusinessAccess(userId, dto.businessId);

    // Validate times
    this.validateTimes(dto.shiftStartTime, dto.shiftEndTime, dto.breakStartTime, dto.breakEndTime);

    // Create template
    const template = await this.prisma.shiftTemplate.create({
      data: {
        name: dto.name,
        businessId: dto.businessId,
        shiftStartTime: dto.shiftStartTime,
        shiftEndTime: dto.shiftEndTime,
        breakStartTime: dto.breakStartTime,
        breakEndTime: dto.breakEndTime,
        notes: dto.notes,
        requiredRoles: dto.requiredRoles as any,
      },
    });

    return {
      message: 'Template created successfully',
      template: this.formatTemplate(template),
    };
  }

  async getTemplates(userId: string, businessId: string) {
    // Verify access
    await this.verifyBusinessAccess(userId, businessId);

    const templates = await this.prisma.shiftTemplate.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      templates: templates.map(t => this.formatTemplate(t)),
    };
  }

  async getTemplate(userId: string, templateId: string) {
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id: templateId },
      include: { business: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Verify access
    await this.verifyBusinessAccess(userId, template.businessId);

    return {
      template: this.formatTemplate(template),
    };
  }

  async updateTemplate(userId: string, templateId: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Verify permissions
    await this.verifyManagerAccess(userId, template.businessId);

    // Validate times if provided
    if (dto.shiftStartTime || dto.shiftEndTime || dto.breakStartTime || dto.breakEndTime) {
      const shiftStartTime = dto.shiftStartTime ?? template.shiftStartTime;
      const shiftEndTime = dto.shiftEndTime ?? template.shiftEndTime;
      const breakStartTime = dto.breakStartTime ?? template.breakStartTime ?? undefined;
      const breakEndTime = dto.breakEndTime ?? template.breakEndTime ?? undefined;

      this.validateTimes(
        shiftStartTime,
        shiftEndTime,
        breakStartTime,
        breakEndTime,
      );
    }

    const updated = await this.prisma.shiftTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.shiftStartTime && { shiftStartTime: dto.shiftStartTime }),
        ...(dto.shiftEndTime && { shiftEndTime: dto.shiftEndTime }),
        ...(dto.breakStartTime !== undefined && { breakStartTime: dto.breakStartTime }),
        ...(dto.breakEndTime !== undefined && { breakEndTime: dto.breakEndTime }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.requiredRoles && { requiredRoles: dto.requiredRoles as any }),
      },
    });

    return {
      message: 'Template updated successfully',
      template: this.formatTemplate(updated),
    };
  }

  async deleteTemplate(userId: string, templateId: string) {
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Verify permissions
    await this.verifyManagerAccess(userId, template.businessId);

    await this.prisma.shiftTemplate.delete({
      where: { id: templateId },
    });

    return {
      message: 'Template deleted successfully',
      deletedId: templateId,
    };
  }

  // ==================== WEEKLY SCHEDULE ====================

  async createWeeklySchedule(userId: string, dto: CreateWeeklyScheduleDto) {
    // Verify permissions
    await this.verifyManagerAccess(userId, dto.businessId);

    // Get template
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.businessId !== dto.businessId) {
      throw new BadRequestException('Template does not belong to this business');
    }

    // Parse start date
    const startDate = new Date(dto.startDate);
    const shifts: any[] = [];

    // Create shifts for each selected day
    for (const day of dto.days) {
      const shiftDate = this.getDateForDay(startDate, day);
      
      // Combine date with time
      const shiftStartTime = this.combineDateAndTime(shiftDate, template.shiftStartTime);
      const shiftEndTime = this.combineDateAndTime(shiftDate, template.shiftEndTime);

      // Create shift
      const shift = await this.prisma.shift.create({
        data: {
          businessId: dto.businessId,
          userId: userId, // Initially assign to creator
          title: template.name,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          break: !!(template.breakStartTime && template.breakEndTime),
          breakStart: template.breakStartTime,
          breakEnd: template.breakEndTime,
          notes: template.notes,
          status: 'scheduled',
          assignedById: userId,
        },
        include: {
          business: true,
        },
      });

      shifts.push(shift);
    }

    // Handle assignments if provided
    if (dto.assignments && dto.assignments.length > 0) {
      for (const assignment of dto.assignments) {
        const dayShift = shifts.find(s => {
          const shiftDate = new Date(s.startTime);
          const dayName = shiftDate.toLocaleDateString('en-US', { weekday: 'long' });
          return dayName === assignment.day;
        });

        if (dayShift) {
          await this.prisma.shift.update({
            where: { id: dayShift.id },
            data: { userId: assignment.userId },
          });
        }
      }
    }

    // Get week bounds
    const weekStart = this.getWeekStart(startDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return {
      message: 'Weekly schedule created successfully',
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      shiftsCreated: shifts.length,
      shifts: shifts.map(s => this.formatShiftDetail(s)),
    };
  }

  async getWeeklySchedule(userId: string, dto: GetWeeklyScheduleDto) {
    // Verify access
    await this.verifyBusinessAccess(userId, dto.businessId);

    const targetDate = dto.date ? new Date(dto.date) : new Date();
    const weekStart = this.getWeekStart(targetDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get all shifts for the week
    const shifts = await this.prisma.shift.findMany({
      where: {
        businessId: dto.businessId,
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
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
        attendance: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Group by day
    const schedule: Array<{ date: Date; dayName: string; shifts: any[] }> = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      
      const dayShifts = shifts.filter(s => {
        const shiftDate = new Date(s.startTime);
        return shiftDate.toDateString() === dayDate.toDateString();
      });

      schedule.push({
        date: dayDate,
        dayName: dayDate.toLocaleDateString('en-US', { weekday: 'long' }),
        shifts: dayShifts.map(s => this.formatShiftDetail(s)),
      });
    }

    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });

    return {
      businessId: dto.businessId,
      businessName: business?.name,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      schedule,
    };
  }

  // ==================== SHIFT ASSIGNMENT ====================

  async assignShift(userId: string, shiftId: string, dto: AssignShiftDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { business: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify permissions
    await this.verifyManagerAccess(userId, shift.businessId);

    // For now, we'll assign the first user (can be extended for multiple assignments)
    if (dto.assignments.length > 0) {
      const assignment = dto.assignments[0];
      
      // Check if user has conflicting shifts
      await this.checkShiftConflict(assignment.userId, shift.startTime, shift.endTime, shiftId);

      const updated = await this.prisma.shift.update({
        where: { id: shiftId },
        data: {
          userId: assignment.userId,
          status: 'assigned',
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

      return {
        message: 'Shift assigned successfully',
        shift: this.formatShiftDetail(updated),
      };
    }

    throw new BadRequestException('No assignments provided');
  }

  async bulkAssign(userId: string, dto: BulkAssignDto) {
    const results: Array<{ shiftId: string; success: boolean; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    for (const assignment of dto.assignments) {
      try {
        const shift = await this.prisma.shift.findUnique({
          where: { id: assignment.shiftId },
        });

        if (!shift) {
          results.push({
            shiftId: assignment.shiftId,
            success: false,
            error: 'Shift not found',
          });
          failedCount++;
          continue;
        }

        // Verify permissions
        await this.verifyManagerAccess(userId, shift.businessId);

        // Check conflicts
        await this.checkShiftConflict(
          assignment.userId,
          shift.startTime,
          shift.endTime,
          assignment.shiftId,
        );

        // Assign
        await this.prisma.shift.update({
          where: { id: assignment.shiftId },
          data: {
            userId: assignment.userId,
            status: 'assigned',
          },
        });

        results.push({
          shiftId: assignment.shiftId,
          success: true,
        });
        successCount++;
      } catch (error) {
        results.push({
          shiftId: assignment.shiftId,
          success: false,
          error: error.message,
        });
        failedCount++;
      }
    }

    return {
      message: `Bulk assignment completed`,
      successCount,
      failedCount,
      results,
    };
  }

  async unassignShift(userId: string, shiftId: string, targetUserId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { business: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify permissions
    await this.verifyManagerAccess(userId, shift.businessId);

    if (shift.userId !== targetUserId) {
      throw new BadRequestException('User is not assigned to this shift');
    }

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        userId: userId, // Assign back to manager/owner
        status: 'scheduled',
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

    return {
      message: 'User unassigned from shift',
      shift: this.formatShiftDetail(updated),
    };
  }

  // ==================== SHIFT MANAGEMENT ====================

  async getShiftDetail(userId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        business: true,
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        attendance: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify access
    await this.verifyBusinessAccess(userId, shift.businessId);

    return {
      shift: this.formatShiftDetail(shift),
    };
  }

  async updateShift(userId: string, shiftId: string, dto: UpdateShiftDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify permissions
    await this.verifyManagerAccess(userId, shift.businessId);

    // If updating times, validate them
    if (dto.shiftStartTime || dto.shiftEndTime) {
      const startTime = dto.shiftStartTime || shift.breakStart;
      const endTime = dto.shiftEndTime || shift.breakEnd;
      
      if (startTime && endTime) {
        this.validateTimes(startTime, endTime);
      }
    }

    // Update shift times
    let updateData: any = {};
    
    if (dto.name) updateData.title = dto.name;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    
    if (dto.shiftStartTime) {
      const shiftDate = new Date(shift.startTime);
      updateData.startTime = this.combineDateAndTime(shiftDate, dto.shiftStartTime);
    }
    
    if (dto.shiftEndTime) {
      const shiftDate = new Date(shift.endTime);
      updateData.endTime = this.combineDateAndTime(shiftDate, dto.shiftEndTime);
    }

    if (dto.breakStartTime !== undefined) {
      updateData.breakStart = dto.breakStartTime;
      updateData.break = !!(dto.breakStartTime && (dto.breakEndTime || shift.breakEnd));
    }
    
    if (dto.breakEndTime !== undefined) {
      updateData.breakEnd = dto.breakEndTime;
      updateData.break = !!((dto.breakStartTime || shift.breakStart) && dto.breakEndTime);
    }

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: updateData,
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

    return {
      message: 'Shift updated successfully',
      shift: this.formatShiftDetail(updated),
    };
  }

  async deleteShift(userId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify permissions
    await this.verifyManagerAccess(userId, shift.businessId);

    await this.prisma.shift.delete({
      where: { id: shiftId },
    });

    return {
      message: 'Shift deleted successfully',
      deletedId: shiftId,
    };
  }

  async duplicateShift(userId: string, shiftId: string, dto: DuplicateShiftDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { business: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify permissions
    await this.verifyManagerAccess(userId, shift.businessId);

    const targetDate = new Date(dto.targetDate);
    const newStartTime = this.combineDateAndTime(targetDate, shift.breakStart || '09:00');
    const newEndTime = this.combineDateAndTime(targetDate, shift.breakEnd || '17:00');

    const newShift = await this.prisma.shift.create({
      data: {
        businessId: shift.businessId,
        userId: dto.copyAssignments ? shift.userId : userId,
        title: shift.title,
        startTime: newStartTime,
        endTime: newEndTime,
        location: shift.location,
        hourlyRate: shift.hourlyRate,
        notes: shift.notes,
        status: 'scheduled',
        break: shift.break,
        breakStart: shift.breakStart,
        breakEnd: shift.breakEnd,
        assignedById: userId,
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

    return {
      message: 'Shift duplicated successfully',
      newShift: this.formatShiftDetail(newShift),
    };
  }

  // ==================== SEARCH & FILTER ====================

  async searchShifts(userId: string, dto: SearchShiftsDto) {
    // Verify access
    await this.verifyBusinessAccess(userId, dto.businessId);

    const where: any = {
      businessId: dto.businessId,
    };

    if (dto.date) {
      const targetDate = new Date(dto.date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (dto.status === 'unassigned') {
      where.status = 'scheduled';
    } else if (dto.status === 'assigned') {
      where.status = { in: ['assigned', 'ongoing', 'completed'] };
    }

    if (dto.query) {
      where.OR = [
        { title: { contains: dto.query, mode: 'insensitive' } },
        { notes: { contains: dto.query, mode: 'insensitive' } },
      ];
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      include: {
        business: true,
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        attendance: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      shifts: shifts.map(s => this.formatShiftDetail(s)),
      totalCount: shifts.length,
    };
  }

  async getAvailableEmployees(userId: string, dto: GetAvailableEmployeesDto) {
    // Verify access
    await this.verifyBusinessAccess(userId, dto.businessId);

    // Get all employees for this business
    const employees = await this.prisma.userBusiness.findMany({
      where: {
        businessId: dto.businessId,
        NOT: [{ role: { equals: 'owner', mode: 'insensitive' } }],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

      const typedEmployees = employees as Array<{
        userId: string;
        role: string | null;
        user: { id: string; fullName: string | null; profileImage: string | null };
      }>;

      // Get their shifts for the date if provided
    let shiftsOnDate: Array<{ userId: string }> = [];
    if (dto.date) {
      const targetDate = new Date(dto.date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      shiftsOnDate = await this.prisma.shift.findMany({
        where: {
          businessId: dto.businessId,
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
    }

    const availableEmployees = employees.map(emp => {
      const userShifts = shiftsOnDate.filter(s => s.userId === emp.userId);
      
      return {
        userId: emp.user.id,
        userName: emp.user.fullName,
        userImage: emp.user.profileImage,
        role: emp.role,
        currentShifts: userShifts.length,
        isAvailable: userShifts.length < 2, // Max 2 shifts per day
      };
    });

    // Filter by role if specified
    if (dto.role) {
      return {
        employees: availableEmployees.filter(e => e.role === dto.role),
      };
    }

    return { employees: availableEmployees };
  }

  // ==================== PREVIEW ====================

  async previewSchedule(userId: string, dto: PreviewScheduleDto) {
    // Verify permissions
    await this.verifyManagerAccess(userId, dto.businessId);

    // Get template
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const startDate = new Date(dto.startDate);
    const preview: Array<{ date: Date; dayName: string; shifts: any[] }> = [];
    const warnings: string[] = [];

    for (const day of dto.days) {
      const shiftDate = this.getDateForDay(startDate, day);
      
      // Find assignment for this day
      const dayAssignment = dto.assignments?.find(a => a.day === day);
      
      let assignedTo: { userName: string | null; role: string } | null = null;
      if (dayAssignment) {
        const user = await this.prisma.user.findUnique({
          where: { id: dayAssignment.userId },
        });
        
        if (user) {
          assignedTo = {
            userName: user.fullName,
            role: dayAssignment.role,
          };

          // Check for potential conflicts
          const existingShifts = await this.prisma.shift.count({
            where: {
              userId: dayAssignment.userId,
              startTime: {
                gte: new Date(shiftDate.setHours(0, 0, 0, 0)),
                lte: new Date(shiftDate.setHours(23, 59, 59, 999)),
              },
            },
          });

          if (existingShifts >= 2) {
            warnings.push(`${user.fullName} already has ${existingShifts} shifts on ${day}`);
          }
        }
      }

      preview.push({
        date: shiftDate,
        dayName: day,
        shifts: [
          {
            name: template.name,
            time: `${template.shiftStartTime} - ${template.shiftEndTime}`,
            location: '126 Avenue-Makcovitz, NY',
            assignedTo,
            requiredRoles: (template.requiredRoles as any) || [],
          },
        ],
      });
    }

    return {
      preview,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ==================== STATISTICS ====================

  async getScheduleStats(userId: string, dto: GetScheduleStatsDto) {
    // Verify access
    await this.verifyBusinessAccess(userId, dto.businessId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const shifts = await this.prisma.shift.findMany({
      where: {
        businessId: dto.businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const totalShifts = shifts.length;
    const assignedShifts = shifts.filter(s => s.status !== 'scheduled').length;
    const unassignedShifts = shifts.filter(s => s.status === 'scheduled').length;
    const completedShifts = shifts.filter(s => s.status === 'completed').length;
    
    const totalHours = shifts.reduce((sum, shift) => {
      const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    // Employee stats
    const employeeMap = new Map();
    shifts.forEach(shift => {
      if (shift.user) {
        const existing = employeeMap.get(shift.userId) || {
          userId: shift.userId,
          userName: shift.user.fullName,
          shiftsCount: 0,
          totalHours: 0,
        };
        
        existing.shiftsCount++;
        const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
        existing.totalHours += hours;
        
        employeeMap.set(shift.userId, existing);
      }
    });

    return {
      stats: {
        totalShifts,
        assignedShifts,
        unassignedShifts,
        completedShifts,
        totalHours: Math.round(totalHours * 10) / 10,
        employeeStats: Array.from(employeeMap.values()).map(emp => ({
          ...emp,
          totalHours: Math.round(emp.totalHours * 10) / 10,
        })),
      },
    };
  }

  // ==================== HELPER METHODS ====================

  private validateTimes(startTime: string, endTime: string, breakStart?: string, breakEnd?: string) {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start >= end) {
      throw new BadRequestException('Shift end time must be after start time');
    }

    if (breakStart && breakEnd) {
      const bStart = this.timeToMinutes(breakStart);
      const bEnd = this.timeToMinutes(breakEnd);

      if (bStart >= bEnd) {
        throw new BadRequestException('Break end time must be after break start time');
      }

      if (bStart < start || bEnd > end) {
        throw new BadRequestException('Break times must be within shift times');
      }
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private getDateForDay(weekStart: Date, dayName: string): Date {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayIndex = days.indexOf(dayName);
    
    if (dayIndex === -1) {
      throw new BadRequestException(`Invalid day name: ${dayName}`);
    }

    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  private async checkShiftConflict(userId: string, startTime: Date, endTime: Date, excludeShiftId?: string) {
    const conflicts = await this.prisma.shift.findMany({
      where: {
        userId,
        id: { not: excludeShiftId },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new ConflictException('User already has a shift at this time');
    }
  }

  private async verifyBusinessAccess(userId: string, businessId: string) {
    const access = await this.prisma.userBusiness.findFirst({
      where: {
        userId,
        businessId,
      },
    });

    if (!access) {
      throw new BadRequestException('No access to this business');
    }
  }

  private async verifyManagerAccess(userId: string, businessId: string) {
    await this.verifyBusinessAccess(userId, businessId);
  }

  private formatTemplate(template: any) {
    return {
      id: template.id,
      name: template.name,
      shiftStartTime: template.shiftStartTime,
      shiftEndTime: template.shiftEndTime,
      breakStartTime: template.breakStartTime,
      breakEndTime: template.breakEndTime,
      businessId: template.businessId,
      notes: template.notes,
      requiredRoles: template.requiredRoles || [],
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private formatShiftDetail(shift: any) {
    const requiredRoles: string[] = [];
    // This would need to be stored in shift or retrieved from template
    
    return {
      id: shift.id,
      name: shift.title,
      date: shift.startTime,
      shiftStartTime: shift.startTime.toTimeString().slice(0, 5),
      shiftEndTime: shift.endTime.toTimeString().slice(0, 5),
      breakStartTime: shift.breakStart,
      breakEndTime: shift.breakEnd,
      location: shift.location,
      business: {
        id: shift.business.id,
        name: shift.business.name,
        logo: shift.business.logo,
      },
      assignedTo: shift.user ? {
        userId: shift.user.id,
        userName: shift.user.fullName,
        userImage: shift.user.profileImage,
        role: 'Employee', // Would need to get from UserBusiness
      } : null,
      status: this.determineShiftStatus(shift),
      requiredRoles,
      notes: shift.notes,
    };
  }

  private determineShiftStatus(shift: any): string {
    const now = new Date();
    const startTime = new Date(shift.startTime);
    const endTime = new Date(shift.endTime);

    if (shift.status === 'completed') return 'completed';
    if (shift.status === 'cancelled') return 'cancelled';
    
    if (shift.userId && shift.userId !== shift.assignedById) {
      if (now >= startTime && now <= endTime && shift.attendance) {
        return 'ongoing';
      }
      return 'assigned';
    }
    
    return 'unassigned';
  }
}
