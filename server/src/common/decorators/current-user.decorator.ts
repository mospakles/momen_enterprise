import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedAdminUser } from '../../auth/admin-auth/admin-jwt.strategy';
import type { AuthenticatedCustomer } from '../../auth/customer-auth/customer-jwt.strategy';

/** Pulls `request.user` — set by whichever JWT strategy authenticated the
 * request (admin or customer). Use the generic to narrow at the call site. */
export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): AuthenticatedAdminUser | AuthenticatedCustomer => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
