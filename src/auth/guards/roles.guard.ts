import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const businessId = request.body?.businessId || request.query?.businessId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // If no businessId provided, check if user has the role in ANY business
    if (!businessId) {
      const userBusinesses = await this.prisma.userBusiness.findMany({
        where: { 
          userId,
          role: { in: requiredRoles }
        },
      });

      if (userBusinesses.length === 0) {
        throw new ForbiddenException(
          `User must have one of these roles: ${requiredRoles.join(', ')}`
        );
      }

      return true;
    }

    // Check if user has required role for specific business
    const userBusiness = await this.prisma.userBusiness.findFirst({
      where: {
        userId,
        businessId,
        role: { in: requiredRoles },
      },
    });

    if (!userBusiness) {
      throw new ForbiddenException(
        `User does not have permission to perform this action. Required roles: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}