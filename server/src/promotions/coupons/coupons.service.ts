import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../../catalog/products/products.service';
import { computeCouponDiscount } from './coupon-validation.util';
import type { CouponValidationContext } from './coupon-validation.util';
import type { UpsertCouponDto } from './dto/upsert-coupon.dto';
import type { ValidateCouponDto } from './dto/validate-coupon.dto';

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountAmount: number;
}

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  private normalize(dto: UpsertCouponDto) {
    return {
      ...dto,
      code: dto.code.trim().toUpperCase(),
      scopeRefs: dto.scopeRefs ?? [],
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    };
  }

  private handleUniqueCode(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A coupon with that code already exists');
    }
    throw error;
  }

  create(dto: UpsertCouponDto) {
    return this.prisma.coupon
      .create({ data: this.normalize(dto) })
      .catch(this.handleUniqueCode);
  }

  async update(id: string, dto: UpsertCouponDto) {
    await this.findOne(id);
    return this.prisma.coupon
      .update({ where: { id }, data: this.normalize(dto) })
      .catch(this.handleUniqueCode);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coupon.delete({ where: { id } });
  }

  /** Validates a coupon code against an order context and returns the
   * discount to apply — throws BadRequestException with a customer-facing
   * reason for every failure mode (expired, min order not met, wrong scope,
   * usage limit, ...). Does not redeem it — see `redeem`, called only once
   * the order this discount belongs to actually gets created. */
  async validate(
    code: string,
    context: Omit<CouponValidationContext, 'customerRedemptionCount'>,
  ): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!coupon) throw new BadRequestException('Invalid coupon code');

    const customerRedemptionCount = context.customerId
      ? await this.prisma.couponRedemption.count({
          where: { couponId: coupon.id, customerId: context.customerId },
        })
      : 0;

    const discountAmount = computeCouponDiscount(coupon, {
      ...context,
      customerRedemptionCount,
    });
    return { couponId: coupon.id, code: coupon.code, discountAmount };
  }

  /** Checkout-preview entry point — resolves each item's live unit price
   * and collection membership itself (from ProductsService) so the frontend
   * doesn't have to duplicate pricing logic just to show a discount
   * preview; see ValidateCouponDto's doc comment for why trusting the
   * client's `subtotal` here is fine. */
  async previewValidate(
    dto: ValidateCouponDto,
    customerId: string | undefined,
  ): Promise<CouponValidationResult> {
    const items = await Promise.all(
      dto.items.map(async (item) => {
        const snapshot = await this.productsService.getPricingSnapshot(
          item.productId,
        );
        return {
          productId: item.productId,
          collectionSlugs: snapshot.collectionSlugs,
          lineTotal: snapshot.unitPrice * item.quantity,
        };
      }),
    );

    const isFirstOrder = customerId
      ? (await this.prisma.order.count({ where: { customerId } })) === 0
      : false;

    return this.validate(dto.code, {
      customerId,
      isFirstOrder,
      subtotal: dto.subtotal,
      items,
    });
  }

  /** Called from within OrdersService.create's transaction once the order
   * row exists — increments the denormalized usageCount and records the
   * redemption in the same atomic unit as the order write. */
  redeem(
    tx: Prisma.TransactionClient,
    couponId: string,
    orderId: string,
    customerId: string | undefined,
    amount: number,
  ) {
    return Promise.all([
      tx.couponRedemption.create({
        data: { couponId, orderId, customerId, amount },
      }),
      tx.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);
  }
}
