import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Permission } from '../enums/permissions.enum';
import { UserRole } from '../enums/roles.enum';
import { ROLE_PERMISSIONS } from '../config/role-permissions.config';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions and roles from decorators
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions or roles required, allow access
    if (!requiredPermissions && !requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get businessId from various sources
    const businessId =
      request.body?.businessId ||
      request.query?.businessId ||
      request.params?.businessId;

    // Get user's role in the business (or any business if not specified)
    const userBusinesses = businessId
      ? await this.prisma.userBusiness.findMany({
          where: {
            userId,
            businessId,
          },
        })
      : await this.prisma.userBusiness.findMany({
          where: { userId },
        });

    if (userBusinesses.length === 0) {
      throw new ForbiddenException('User is not associated with any business');
    }

    // Check if user has required roles
    if (requiredRoles) {
      const userRoles = userBusinesses
        .map((ub) => ub.role)
        .filter((role): role is string => role !== null);

      const hasRequiredRole = requiredRoles.some((role) =>
        userRoles.includes(role),
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          `User must have one of these roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check if user has required permissions
    if (requiredPermissions) {
      const userPermissions = new Set<string>();

      const customRoleQueries: { businessId: string; name: string }[] = [];

      for (const ub of userBusinesses) {
        if (!ub.role) continue;

        const maybePredefined = ub.role as UserRole;
        if (Object.values(UserRole).includes(maybePredefined)) {
          const rolePermissions = ROLE_PERMISSIONS[maybePredefined] || [];
          rolePermissions.forEach((perm) => userPermissions.add(perm));
          continue;
        }

        customRoleQueries.push({ businessId: ub.businessId, name: ub.role });
      }

      if (customRoleQueries.length > 0) {
        const dbRoles = await this.prisma.role.findMany({
          where: {
            OR: customRoleQueries.map((q) => ({
              businessId: q.businessId,
              name: q.name,
            })),
          },
          select: { permissions: true },
        });

        for (const role of dbRoles) {
          const permissions = role.permissions as unknown;
          if (!permissions) continue;

          if (Array.isArray(permissions)) {
            for (const perm of permissions) {
              if (typeof perm === 'string') userPermissions.add(perm);
            }
            continue;
          }

          if (typeof permissions === 'object') {
            for (const actions of Object.values(permissions as Record<string, unknown>)) {
              if (!Array.isArray(actions)) continue;
              for (const action of actions) {
                if (typeof action === 'string') userPermissions.add(action);
              }
            }
          }
        }
      }

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.has(permission),
      );

      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(
          (perm) => !userPermissions.has(perm),
        );

        throw new ForbiddenException(
          `Missing required permissions: ${missingPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
