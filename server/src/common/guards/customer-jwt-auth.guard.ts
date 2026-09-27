import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedCustomer } from '../../auth/customer-auth/customer-jwt.strategy';

/** Requires a logged-in customer — account pages, wishlist, etc. */
@Injectable()
export class CustomerJwtAuthGuard extends AuthGuard('customer-jwt') {}

/** Authenticates a customer if a token is present, but never rejects the
 * request otherwise — powers guest checkout, where `request.user` is simply
 * null for a guest. */
@Injectable()
export class OptionalCustomerJwtAuthGuard extends AuthGuard('customer-jwt') {
  handleRequest<TUser = AuthenticatedCustomer | null>(
    _err: unknown,
    user: unknown,
  ): TUser {
    return (user ?? null) as TUser;
  }
}
