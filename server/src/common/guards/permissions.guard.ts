import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthenticatedAdminUser } from '../../auth/admin-auth/admin-jwt.strategy';

/** Runs after `AdminJwtAuthGuard`. Reads the `@Permissions(resource, action)`
 * metadata on the handler (falling back to the controller) and checks it
 * against the permission set `AdminJwtStrategy` attached to `request.user`. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<
      { resource: string; action: string } | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const user = context.switchToHttp().getRequest().user as
      AuthenticatedAdminUser | undefined;
    if (
      !user ||
      !user.permissions.has(`${required.resource}:${required.action}`)
    ) {
      throw new ForbiddenException(
        `Missing permission ${required.resource}:${required.action}`,
      );
    }
    return true;
  }
}
