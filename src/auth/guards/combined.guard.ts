import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from './permissions.guard';

@Injectable()
export class CombinedAuthGuard extends AuthGuard('jwt') {
  constructor(private permissionsGuard: PermissionsGuard) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check JWT authentication
    const jwtResult = await super.canActivate(context);
    if (!jwtResult) {
      return false;
    }

    // Then check permissions
    return this.permissionsGuard.canActivate(context);
  }
}