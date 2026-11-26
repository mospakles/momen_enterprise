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
import { WELCOME_CODE } from '../../common/storefront-offer';

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountAmount: number;
}

/** One mailbox, however it's written: lower case, no "+tag", and for Gmail
 * no dots (a.b+promo@gmail.com and ab@googlemail.com are the same inbox). */
export function normalizeEmail(email: string) {
  const [local = '', domain = ''] = email.trim().toLowerCase().split('@');
  const base = local.split('+')[0];
  return domain === 'gmail.com' || domain === 'googlemail.com'
    ? `${base.replace(/\./g, '')}@gmail.com`
    : `${base}@${domain}`;
}

/** The last ten digits, so +234 803…, 234803… and 0803… match. */
export function normalizePhone(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : undefined;
}

/** True when this person has no earlier order that's paid or still awaiting
 * payment. Failed and cancelled attempts don't count, so a customer whose
 * first payment didn't go through keeps the welcome offer. The same mailbox
 * under a "+tag" or Gmail dots, or the same phone number, counts as the same
 * person. */
export async function isFirstOrder(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
  customerEmail: string,
  customerId?: string,
  phone?: string,
) {
  const email = normalizeEmail(customerEmail);
  const phoneKey = normalizePhone(phone) ?? null;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Order"
    WHERE ("paymentStatus" IN ('paid', 'refunded', 'partially_refunded')
           OR ("paymentStatus" = 'pending' AND "status" <> 'Cancelled'))
      AND (
        (CASE WHEN split_part(lower("customerEmail"), '@', 2) IN ('gmail.com', 'googlemail.com')
              THEN replace(split_part(split_part(lower("customerEmail"), '@', 1), '+', 1), '.', '') || '@gmail.com'
              ELSE split_part(split_part(lower("customerEmail"), '@', 1), '+', 1) || '@' || split_part(lower("customerEmail"), '@', 2)
         END) = ${email}
        OR "customerId" = ${customerId ?? null}
        OR (${phoneKey}::text IS NOT NULL
            AND length(regexp_replace(coalesce("addressSnapshot"->>'phone', ''), '\D', '', 'g')) >= 10
            AND right(regexp_replace("addressSnapshot"->>'phone', '\D', '', 'g'), 10) = ${phoneKey})
      )
    LIMIT 1`;
  return rows.length === 0;
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
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<CouponValidationResult> {
    const coupon = await db.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!coupon) throw new BadRequestException('Invalid coupon code');

    const customerRedemptionCount = context.customerId
      ? await db.couponRedemption.count({
          where: { couponId: coupon.id, customerId: context.customerId },
        })
      : 0;

    const discountAmount = computeCouponDiscount(coupon, {
      ...context,
      customerRedemptionCount,
    });
    return { couponId: coupon.id, code: coupon.code, discountAmount };
  }

  async automaticWelcome(
    tx: Prisma.TransactionClient,
    context: Pick<CouponValidationContext, 'isFirstOrder' | 'subtotal' | 'items' | 'customerId'>,
  ) {
    if (!context.isFirstOrder || context.subtotal <= 0) return undefined;
    try {
      return await this.validate(WELCOME_CODE, { ...context, guestFirstOrder: !context.customerId }, tx);
    } catch (error) {
      // The welcome offer is optional when it has expired or been disabled.
      if (!(error instanceof BadRequestException)) throw error;
      return undefined;
    }
  }

  /** Checkout-preview entry point — resolves each item's live unit price
   * and collection membership itself (from ProductsService) so the frontend
   * doesn't have to duplicate pricing logic just to show a discount
   * preview; see ValidateCouponDto's doc comment for why trusting the
   * client's `subtotal` here is fine. */
  async previewValidate(
    dto: ValidateCouponDto,
    customerId: string | undefined,
    customerEmail?: string,
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

    const firstOrder = customerId && customerEmail
      ? await isFirstOrder(this.prisma, customerEmail, customerId)
      : false;

    return this.validate(dto.code, {
      customerId,
      isFirstOrder: firstOrder,
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
