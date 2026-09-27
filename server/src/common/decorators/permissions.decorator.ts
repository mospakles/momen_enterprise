import { SetMetadata } from '@nestjs/common';
import type { PermissionAction, PermissionResource } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';

/** Declares the (resource, action) pair a route requires. Combined with
 * `AdminJwtAuthGuard` + `PermissionsGuard` on the controller/route. */
export const Permissions = (
  resource: PermissionResource,
  action: PermissionAction,
) => SetMetadata(PERMISSIONS_KEY, { resource, action });
