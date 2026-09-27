import { BadRequestException } from '@nestjs/common';
import { Coupon, DiscountType, PromotionScope } from '@prisma/client';
import {
  computeCouponDiscount,
  CouponValidationContext,
} from './coupon-validation.util';

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'coupon-1',
    code: 'SAVE10',
    type: DiscountType.percentage,
    value: 10 as unknown as Coupon['value'],
    scope: PromotionScope.all,
    scopeRefs: [],
    minOrderValue: null,
    usageLimit: null,
    usageCount: 0,
    perCustomerLimit: null,
    startsAt: null,
    expiresAt: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Coupon;
}

function makeContext(
  overrides: Partial<CouponValidationContext> = {},
): CouponValidationContext {
  return {
    customerId: 'cus-1',
    isFirstOrder: false,
    subtotal: 100,
    items: [{ productId: 'prod-1', collectionSlugs: [], lineTotal: 100 }],
    customerRedemptionCount: 0,
    ...overrides,
  };
}

describe('computeCouponDiscount', () => {
  it('applies a percentage discount to the whole subtotal for an "all" scope coupon', () => {
    expect(
      computeCouponDiscount(
        makeCoupon({ type: DiscountType.percentage, value: 10 as never }),
        makeContext({ subtotal: 100 }),
      ),
    ).toBe(10);
  });

  it('caps a fixed discount at the eligible amount so it never produces a negative total', () => {
    expect(
      computeCouponDiscount(
        makeCoupon({ type: DiscountType.fixed, value: 500 as never }),
        makeContext({ subtotal: 100 }),
      ),
    ).toBe(100);
  });

  it('rejects an inactive coupon', () => {
    expect(() =>
      computeCouponDiscount(makeCoupon({ active: false }), makeContext()),
    ).toThrow(BadRequestException);
  });

  it('rejects a coupon before its start date', () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(() =>
      computeCouponDiscount(makeCoupon({ startsAt: future }), makeContext()),
    ).toThrow(BadRequestException);
  });

  it('rejects an expired coupon', () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(() =>
      computeCouponDiscount(makeCoupon({ expiresAt: past }), makeContext()),
    ).toThrow(BadRequestException);
  });

  it('rejects once the coupon has hit its overall usage limit', () => {
    expect(() =>
      computeCouponDiscount(
        makeCoupon({ usageLimit: 5, usageCount: 5 }),
        makeContext(),
      ),
    ).toThrow(BadRequestException);
  });

  it("rejects an order below the coupon's minimum order value", () => {
    expect(() =>
      computeCouponDiscount(
        makeCoupon({ minOrderValue: 200 as never }),
        makeContext({ subtotal: 100 }),
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects once this specific customer has hit their per-customer redemption limit', () => {
    expect(() =>
      computeCouponDiscount(
        makeCoupon({ perCustomerLimit: 1 }),
        makeContext({ customerRedemptionCount: 1 }),
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a first-order coupon for a guest (no customerId to verify against)', () => {
    expect(() =>
      computeCouponDiscount(
        makeCoupon({ scope: PromotionScope.first_order }),
        makeContext({ customerId: undefined }),
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a first-order coupon for a returning customer', () => {
    expect(() =>
      computeCouponDiscount(
        makeCoupon({ scope: PromotionScope.first_order }),
        makeContext({ isFirstOrder: false }),
      ),
    ).toThrow(BadRequestException);
  });

  it('accepts a first-order coupon for a logged-in customer on their first order', () => {
    expect(
      computeCouponDiscount(
        makeCoupon({
          scope: PromotionScope.first_order,
          type: DiscountType.fixed,
          value: 20 as never,
        }),
        makeContext({ isFirstOrder: true }),
      ),
    ).toBe(20);
  });

  it('rejects a customer-scoped coupon when the customer is not on the allow-list', () => {
    expect(() =>
      computeCouponDiscount(
        makeCoupon({
          scope: PromotionScope.customer,
          scopeRefs: ['someone-else'],
        }),
        makeContext({ customerId: 'cus-1' }),
      ),
    ).toThrow(BadRequestException);
  });

  it('only discounts line items belonging to the scoped product, not the whole cart', () => {
    const coupon = makeCoupon({
      scope: PromotionScope.product,
      scopeRefs: ['prod-1'],
      type: DiscountType.percentage,
      value: 50 as never,
    });
    const context = makeContext({
      subtotal: 150,
      items: [
        { productId: 'prod-1', collectionSlugs: [], lineTotal: 100 },
        { productId: 'prod-2', collectionSlugs: [], lineTotal: 50 },
      ],
    });

    // 50% off only the prod-1 line (100), not the full 150 subtotal.
    expect(computeCouponDiscount(coupon, context)).toBe(50);
  });

  it('only discounts line items whose product is in the scoped collection', () => {
    const coupon = makeCoupon({
      scope: PromotionScope.collection,
      scopeRefs: ['heritage'],
      type: DiscountType.fixed,
      value: 1000 as never,
    });
    const context = makeContext({
      subtotal: 150,
      items: [
        { productId: 'prod-1', collectionSlugs: ['heritage'], lineTotal: 100 },
        { productId: 'prod-2', collectionSlugs: ['everyday'], lineTotal: 50 },
      ],
    });

    // Fixed 1000 off, but capped at the 100 eligible (heritage-collection) amount.
    expect(computeCouponDiscount(coupon, context)).toBe(100);
  });

  it('rejects a product/collection-scoped coupon when nothing in the cart matches its scope', () => {
    const coupon = makeCoupon({
      scope: PromotionScope.product,
      scopeRefs: ['prod-does-not-exist'],
    });
    expect(() => computeCouponDiscount(coupon, makeContext())).toThrow(
      BadRequestException,
    );
  });
});
