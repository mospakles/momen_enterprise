import { BadRequestException } from '@nestjs/common';
import { Coupon, DiscountType, PromotionScope } from '@prisma/client';

export interface CouponValidationContext {
  customerId?: string;
  isFirstOrder: boolean;
  subtotal: number;
  items: { productId: string; collectionSlugs: string[]; lineTotal: number }[];
  /** How many times this customer has already redeemed this coupon. */
  customerRedemptionCount: number;
}

/**
 * Pure function (no DB access) so the actual discount math is unit-testable
 * without mocking Prisma — CouponsService.validateAndCompute does the
 * lookups and redemption-count query, then hands off to this.
 */
export function computeCouponDiscount(
  coupon: Coupon,
  context: CouponValidationContext,
): number {
  const now = new Date();

  if (!coupon.active)
    throw new BadRequestException('This coupon is no longer active');
  if (coupon.startsAt && now < coupon.startsAt)
    throw new BadRequestException('This coupon is not active yet');
  if (coupon.expiresAt && now > coupon.expiresAt)
    throw new BadRequestException('This coupon has expired');
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new BadRequestException('This coupon has reached its usage limit');
  }
  if (
    coupon.minOrderValue !== null &&
    context.subtotal < Number(coupon.minOrderValue)
  ) {
    throw new BadRequestException(
      `This coupon requires a minimum order value of ${Number(coupon.minOrderValue)}`,
    );
  }
  if (
    coupon.perCustomerLimit !== null &&
    context.customerRedemptionCount >= coupon.perCustomerLimit
  ) {
    throw new BadRequestException(
      'You have already used this coupon the maximum number of times',
    );
  }

  if (coupon.scope === PromotionScope.first_order) {
    if (!context.customerId)
      throw new BadRequestException('Sign in to use this coupon');
    if (!context.isFirstOrder)
      throw new BadRequestException(
        'This coupon is only valid on your first order',
      );
  }
  if (coupon.scope === PromotionScope.customer) {
    if (!context.customerId || !coupon.scopeRefs.includes(context.customerId)) {
      throw new BadRequestException(
        'This coupon is not valid for your account',
      );
    }
  }

  const eligibleSubtotal = resolveEligibleSubtotal(coupon, context);
  if (eligibleSubtotal <= 0)
    throw new BadRequestException(
      'This coupon does not apply to anything in your cart',
    );

  const rawDiscount =
    coupon.type === DiscountType.percentage
      ? eligibleSubtotal * (Number(coupon.value) / 100)
      : Number(coupon.value);
  return Math.round(Math.min(rawDiscount, eligibleSubtotal) * 100) / 100;
}

function resolveEligibleSubtotal(
  coupon: Coupon,
  context: CouponValidationContext,
): number {
  if (coupon.scope === PromotionScope.product) {
    return context.items
      .filter((i) => coupon.scopeRefs.includes(i.productId))
      .reduce((sum, i) => sum + i.lineTotal, 0);
  }
  if (coupon.scope === PromotionScope.collection) {
    return context.items
      .filter((i) =>
        i.collectionSlugs.some((slug) => coupon.scopeRefs.includes(slug)),
      )
      .reduce((sum, i) => sum + i.lineTotal, 0);
  }
  // all / first-order / customer scopes apply to the whole order
  return context.subtotal;
}
