import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CustomizationApprovalStatus,
  NoteAudience,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../../catalog/products/products.service';
import { ProductionStaffService } from '../../production/production-staff/production-staff.service';
import { ProductionTimelineResolverService } from '../../production/production-timeline-rules/production-timeline-resolver.service';
import { DeliveryZonesService } from '../../delivery/delivery-zones/delivery-zones.service';
import { CouponsService, isFirstOrder } from '../../promotions/coupons/coupons.service';
import { WELCOME_CODE } from '../../common/storefront-offer';
import { GiftCardsService } from '../../promotions/gift-cards/gift-cards.service';
import { generateOrderId } from './order-id.util';
import { isCustomOrderRequest, stagesForItems } from './order-stages.util';
import {
  isStockTracked,
  measurementValuesError,
  missingMeasurementsError,
  requiresMeasurements,
} from './order-items.util';
import { toApiUnit } from '../../common/utils/measurement-unit.util';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateOrderStatusDto } from './dto/update-status.dto';
import type { AddOrderNoteDto } from './dto/add-note.dto';
import type { UpdateOrderProductionDto } from './dto/update-production.dto';
import type { UpdateCustomizationStatusDto } from './dto/update-customization-status.dto';

interface OrderActor {
  id?: string;
  name: string;
}

// Express orders auto-prioritize over standard ones in the production
// queue — see ProductionQueueService, which sorts on this field.
const PRIORITY_STANDARD = 40;
const PRIORITY_EXPRESS = 90;

const stockLogger = new Logger('OrderStock');

interface StockLine {
  productId: string | null;
  size: string;
  quantity: number;
}

/** The order's lines whose product stock is actually tracked — the same
 * `isStockTracked` rule create() used when reserving. Lines whose product
 * has since been deleted (productId null) have nothing to adjust. Every
 * statement below is a conditional `updateMany` (never a throwing `update`)
 * because a failed statement aborts a Postgres interactive transaction. */
async function stockTrackedLines(
  tx: Prisma.TransactionClient,
  items: StockLine[],
): Promise<(StockLine & { productId: string })[]> {
  const ids = [
    ...new Set(items.map((i) => i.productId).filter((id): id is string => !!id)),
  ];
  if (ids.length === 0) return [];
  const products = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, sizingMode: true },
  });
  const tracked = new Set(
    products.filter((p) => isStockTracked(p)).map((p) => p.id),
  );
  return items.filter(
    (i): i is StockLine & { productId: string } =>
      !!i.productId && tracked.has(i.productId),
  );
}

/** Returns stock held for an unpaid order to the shelf (product and size).
 * Guarded so a counter can never be pushed below zero. */
async function releaseReservations(
  tx: Prisma.TransactionClient,
  items: StockLine[],
) {
  for (const item of await stockTrackedLines(tx, items)) {
    const { count } = await tx.product.updateMany({
      where: { id: item.productId, reservedQuantity: { gte: item.quantity } },
      data: { reservedQuantity: { decrement: item.quantity } },
    });
    if (count === 0)
      stockLogger.warn(
        `Release skipped for product ${item.productId}: fewer than ${item.quantity} units reserved`,
      );
    await tx.productSize.updateMany({
      where: {
        productId: item.productId,
        label: item.size,
        stockQuantity: { not: null },
        reservedQuantity: { gte: item.quantity },
      },
      data: { reservedQuantity: { decrement: item.quantity } },
    });
  }
}

/** Payment confirmed while the reservation is still held: the reserved
 * units become sold units. If the reservation is somehow missing, the sale
 * is still recorded against stockQuantity. */
async function convertReservations(
  tx: Prisma.TransactionClient,
  items: StockLine[],
) {
  for (const item of await stockTrackedLines(tx, items)) {
    const converted = await tx.product.updateMany({
      where: { id: item.productId, reservedQuantity: { gte: item.quantity } },
      data: {
        stockQuantity: { decrement: item.quantity },
        reservedQuantity: { decrement: item.quantity },
      },
    });
    if (converted.count === 0) {
      stockLogger.warn(
        `No reservation found for product ${item.productId}; decrementing stock only`,
      );
      await tx.product.updateMany({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }
    const sizeWhere = {
      productId: item.productId,
      label: item.size,
      stockQuantity: { not: null },
    };
    const sizeConverted = await tx.productSize.updateMany({
      where: { ...sizeWhere, reservedQuantity: { gte: item.quantity } },
      data: {
        stockQuantity: { decrement: item.quantity },
        reservedQuantity: { decrement: item.quantity },
      },
    });
    if (sizeConverted.count === 0)
      await tx.productSize.updateMany({
        where: sizeWhere,
        data: { stockQuantity: { decrement: item.quantity } },
      });
  }
}

/** Payment confirmed after the reservation was already released (a failed
 * attempt, then a successful retry): only the shelf stock moves. */
async function decrementStock(tx: Prisma.TransactionClient, items: StockLine[]) {
  for (const item of await stockTrackedLines(tx, items)) {
    await tx.product.updateMany({
      where: { id: item.productId },
      data: { stockQuantity: { decrement: item.quantity } },
    });
    await tx.productSize.updateMany({
      where: {
        productId: item.productId,
        label: item.size,
        stockQuantity: { not: null },
      },
      data: { stockQuantity: { decrement: item.quantity } },
    });
  }
}

/** An admin moving a failed payment back to pending: hold the stock again,
 * so "pending and not cancelled" always means "reservation held". */
async function reReserve(tx: Prisma.TransactionClient, items: StockLine[]) {
  for (const item of await stockTrackedLines(tx, items)) {
    await tx.product.updateMany({
      where: { id: item.productId },
      data: { reservedQuantity: { increment: item.quantity } },
    });
    await tx.productSize.updateMany({
      where: {
        productId: item.productId,
        label: item.size,
        stockQuantity: { not: null },
      },
      data: { reservedQuantity: { increment: item.quantity } },
    });
  }
}

const outOfStockMessage = (name: string, available: number, size?: string) => {
  const where = size ? ` in size ${size}` : '';
  return available > 0
    ? `Only ${available} left of ${name}${where}`
    : `${name}${where} is sold out`;
};

/** Reserves (or, for an order already paid, sells) `quantity` units of a
 * product — and of its size row when that size is tracked — only if that
 * many are still available at this instant. The guard lives in the UPDATE's
 * WHERE clause, so two concurrent checkouts can't both take the last unit. */
async function takeStock(
  tx: Prisma.TransactionClient,
  line: { productId: string; name: string; quantity: number; size?: string },
  mode: 'reserve' | 'sell',
) {
  const { productId, name, quantity, size } = line;
  if (size === undefined) {
    const count =
      mode === 'reserve'
        ? await tx.$executeRaw`UPDATE "Product" SET "reservedQuantity" = "reservedQuantity" + ${quantity} WHERE "id" = ${productId} AND "stockQuantity" - "reservedQuantity" >= ${quantity}`
        : await tx.$executeRaw`UPDATE "Product" SET "stockQuantity" = "stockQuantity" - ${quantity} WHERE "id" = ${productId} AND "stockQuantity" - "reservedQuantity" >= ${quantity}`;
    if (count === 0) {
      const p = await tx.product.findUnique({
        where: { id: productId },
        select: { stockQuantity: true, reservedQuantity: true },
      });
      throw new ConflictException(
        outOfStockMessage(
          name,
          Math.max(0, (p?.stockQuantity ?? 0) - (p?.reservedQuantity ?? 0)),
        ),
      );
    }
    return;
  }

  const sizeRow = await tx.productSize.findFirst({
    where: { productId, label: size, stockQuantity: { not: null } },
    select: { stockQuantity: true, reservedQuantity: true },
  });
  if (!sizeRow) return; // size not tracked individually — product counters apply
  const count =
    mode === 'reserve'
      ? await tx.$executeRaw`UPDATE "ProductSize" SET "reservedQuantity" = "reservedQuantity" + ${quantity} WHERE "productId" = ${productId} AND "label" = ${size} AND "stockQuantity" IS NOT NULL AND "stockQuantity" - "reservedQuantity" >= ${quantity}`
      : await tx.$executeRaw`UPDATE "ProductSize" SET "stockQuantity" = "stockQuantity" - ${quantity} WHERE "productId" = ${productId} AND "label" = ${size} AND "stockQuantity" IS NOT NULL AND "stockQuantity" - "reservedQuantity" >= ${quantity}`;
  if (count === 0) {
    const fresh = await tx.productSize.findFirst({
      where: { productId, label: size, stockQuantity: { not: null } },
      select: { stockQuantity: true, reservedQuantity: true },
    });
    throw new ConflictException(
      outOfStockMessage(
        name,
        Math.max(0, (fresh?.stockQuantity ?? 0) - (fresh?.reservedQuantity ?? 0)),
        size,
      ),
    );
  }
}

const ORDER_INCLUDE = {
  items: true,
  timeline: { orderBy: { sortOrder: 'asc' } },
  notes: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly productionStaffService: ProductionStaffService,
    private readonly timelineResolver: ProductionTimelineResolverService,
    private readonly deliveryZonesService: DeliveryZonesService,
    private readonly couponsService: CouponsService,
    private readonly giftCardsService: GiftCardsService,
    private readonly events: EventEmitter2,
  ) {}

  private serialize(order: OrderWithRelations) {
    const displayStatus = (status: OrderStatus) =>
      status
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    return {
      id: order.id,
      date: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        product: {
          id: item.productId,
          slug: item.productSlug,
          name: item.productName,
          images: item.productImage ? [item.productImage] : [],
          price: Number(item.unitPrice),
        },
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        fit: (item.fit as 'standard' | 'measure' | null) ?? undefined,
        customizations:
          (item.customizations as Record<string, string> | null) ?? undefined,
        customOrder:
          (item.customOrder as Record<string, unknown> | null) ?? undefined,
        customizationCost: Number(item.customizationCost),
        measurement: {
          mode: item.measurementMode,
          profileId: item.measurementProfileId ?? undefined,
          values:
            (item.measurementValues as Record<string, number> | null) ??
            undefined,
          unit: toApiUnit(item.measurementUnit),
        },
      })),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      expressFee: Number(order.expressFee),
      discount: Number(order.discount),
      couponCode: order.couponCode ?? undefined,
      total: Number(order.total),
      productionSpeed: order.productionSpeed,
      deliveryMethod: order.deliveryMethod,
      estimatedCompletion: order.estimatedCompletion?.toISOString(),
      estimatedDelivery: order.estimatedDelivery?.toISOString(),
      paymentStatus: order.paymentStatus,
      paymentMethod:
        order.paymentMethod === 'gift_card'
          ? 'gift-card'
          : (order.paymentMethod ?? undefined),
      paymentProvider: order.paymentProvider ?? undefined,
      transactionId: order.transactionId ?? undefined,
      address: order.addressSnapshot,
      timeline: order.timeline.map((t) => ({
        stage: displayStatus(t.stage),
        date: t.date.toISOString(),
        message: t.message ?? undefined,
        complete: t.complete,
      })),
      status: displayStatus(order.status),
      customerId: order.customerId ?? undefined,
      customerEmail: order.customerEmail,
      internalNotes: order.notes
        .filter((n) => n.audience === NoteAudience.internal)
        .map(this.serializeNote),
      customerNotes: order.notes
        .filter((n) => n.audience === NoteAudience.customer)
        .map(this.serializeNote),
      production: {
        assignedStaffId: order.assignedStaffId ?? undefined,
        priority: order.productionPriority,
        startDate: order.productionStartDate?.toISOString(),
        expectedCompletionDate:
          order.productionExpectedCompletionDate?.toISOString(),
        actualCompletionDate:
          order.productionActualCompletionDate?.toISOString(),
        // Real per-production notes arrive with the Production module's own
        // table — this stays empty until then rather than conflating with
        // the general internal notes above.
        notes: [] as unknown[],
      },
      cancelledAt: order.cancelledAt?.toISOString(),
      cancelledReason: order.cancelledReason ?? undefined,
      channel: order.channel,
      customizationStatus: order.customizationStatus,
    };
  }

  private serializeNote(note: {
    id: string;
    authorName: string;
    message: string;
    createdAt: Date;
  }) {
    return {
      id: note.id,
      author: note.authorName,
      message: note.message,
      date: note.createdAt.toISOString(),
    };
  }

  async create(
    dto: CreateOrderDto,
    actor: { customerId?: string; customerEmail?: string },
  ) {
    if (!actor.customerId && !dto.customerEmail)
      throw new BadRequestException(
        'customerEmail is required for guest checkout',
      );
    if (dto.items.length === 0)
      throw new BadRequestException('Order must contain at least one item');

    let customerEmail = dto.customerEmail;
    let actorName = 'Guest';
    if (actor.customerId) {
      const customer = await this.prisma.customer.findUniqueOrThrow({
        where: { id: actor.customerId },
      });
      customerEmail = customer.email;
      actorName = customer.name;
    }
    const checkoutEmail = customerEmail!.trim().toLowerCase();

    const pricedItems = await Promise.all(
      dto.items.map(async (item) => {
        const snapshot = await this.productsService.getPricingSnapshot(
          item.productId,
        );
        if (!snapshot.isEffectivelyPublished)
          throw new BadRequestException(
            `Product ${item.productId} is not available`,
          );

        // Drives the awaiting_measurements / measurements_confirmed stages:
        // what the customer actually chose for this line, not merely that
        // the product *can* be cut to measure (a standard size of a "both"
        // product needs no measurements).
        const needsMeasurements = requiresMeasurements({
          fit: item.fit,
          size: item.size,
          sizingMode: snapshot.sizingMode,
        });
        const valuesError = measurementValuesError(item.measurement.values);
        if (valuesError) throw new BadRequestException(valuesError);
        if (needsMeasurements) {
          const missing = missingMeasurementsError(
            item.measurement,
            snapshot.name,
          );
          if (missing) throw new BadRequestException(missing);
        }

        let customizationCost = 0;
        for (const [groupId, choiceId] of Object.entries(
          item.customizations ?? {},
        )) {
          customizationCost += snapshot.getChoiceCost(groupId, choiceId);
        }
        if (item.customOrder?.fabricId)
          customizationCost += snapshot.getFabricCost(
            item.customOrder.fabricId,
          );

        let measurementValues: Record<string, number> | undefined =
          item.measurement.values;
        let measurementUnit = item.measurement.unit;
        if (item.measurement.mode === 'profile') {
          if (!actor.customerId)
            throw new BadRequestException(
              'A saved measurement profile requires a logged-in customer',
            );
          if (!item.measurement.profileId)
            throw new BadRequestException(
              'profileId is required when measurement mode is "profile"',
            );
          const profile = await this.prisma.measurementProfile.findUnique({
            where: { id: item.measurement.profileId },
          });
          if (!profile || profile.customerId !== actor.customerId)
            throw new ForbiddenException('Measurement profile not found');
          measurementValues = profile.values as Record<string, number>;
          // The snapshot is in the profile's own unit, whatever the client sent.
          measurementUnit = profile.unit;
          if (
            needsMeasurements &&
            (!measurementValues ||
              typeof measurementValues !== 'object' ||
              Object.keys(measurementValues).length === 0)
          )
            throw new BadRequestException(
              `The measurement profile "${profile.label}" has no measurements yet`,
            );
        }

        return {
          dtoItem: item,
          snapshot,
          isMadeToMeasure: needsMeasurements,
          measurementUnit,
          hasCustomOrder: Boolean(
            (item.customOrder?.referenceImages?.length ?? 0) > 0 ||
            item.customOrder?.specialInstructions,
          ),
          customizationCost,
          measurementValues,
          lineTotal: (snapshot.unitPrice + customizationCost) * item.quantity,
        };
      }),
    );

    // Stock is checked on the *total* asked for per product and per
    // product+size — two lines of the same size must not each pass on their
    // own. This early check gives a friendly error before coupons/delivery
    // are resolved; the authoritative guard is the conditional UPDATE inside
    // the create transaction below.
    const stockDemand = new Map<
      string,
      {
        productId: string;
        name: string;
        quantity: number;
        available: number;
        sizes: Map<string, { quantity: number; available?: number }>;
      }
    >();
    for (const p of pricedItems) {
      if (!isStockTracked(p.snapshot)) continue;
      const productId = p.dtoItem.productId;
      let entry = stockDemand.get(productId);
      if (!entry) {
        entry = {
          productId,
          name: p.snapshot.name,
          quantity: 0,
          available: p.snapshot.stockQuantity - p.snapshot.reservedQuantity,
          sizes: new Map(),
        };
        stockDemand.set(productId, entry);
      }
      entry.quantity += p.dtoItem.quantity;
      const size = entry.sizes.get(p.dtoItem.size) ?? {
        quantity: 0,
        available: p.snapshot.sizeAvailable(p.dtoItem.size),
      };
      size.quantity += p.dtoItem.quantity;
      entry.sizes.set(p.dtoItem.size, size);
    }
    for (const entry of stockDemand.values()) {
      for (const [label, size] of entry.sizes) {
        if (size.available !== undefined && size.available < size.quantity)
          throw new ConflictException(
            outOfStockMessage(entry.name, Math.max(0, size.available), label),
          );
      }
      if (entry.available < entry.quantity)
        throw new ConflictException(
          outOfStockMessage(entry.name, Math.max(0, entry.available)),
        );
    }

    const subtotal = pricedItems.reduce((sum, i) => sum + i.lineTotal, 0);

    // Replaces trusting deliveryFee/expressFee as client input — resolved
    // from DeliveryZone data matched against the destination country.
    const deliveryMethod = dto.deliveryMethod ?? 'delivery';
    const deliveryQuote = await this.deliveryZonesService.quote(
      dto.address.country,
      dto.productionSpeed,
      subtotal,
      deliveryMethod,
    );
    const stages = stagesForItems(pricedItems);
    const now = new Date();
    const customizationStatus = isCustomOrderRequest(pricedItems)
      ? CustomizationApprovalStatus.submitted
      : CustomizationApprovalStatus.not_applicable;

    // Configurable per product/collection/garment/country, not hardcoded —
    // see ProductionTimelineResolverService.
    const { max: productionDays } = await this.timelineResolver.resolveForOrder(
      pricedItems.map((p) => ({
        productSlug: p.snapshot.slug,
        collectionSlugs: p.snapshot.collectionSlugs,
        garment: p.snapshot.garment,
        fallback: p.snapshot.productionDays,
      })),
      dto.productionSpeed,
      dto.address.country,
    );
    const estimatedCompletion = new Date(
      now.getTime() + productionDays * 24 * 60 * 60 * 1000,
    );
    const deliveryDays =
      dto.productionSpeed === 'express'
        ? deliveryQuote.expressDays[1]
        : deliveryQuote.standardDays[1];
    const estimatedDelivery = new Date(
      estimatedCompletion.getTime() + deliveryDays * 24 * 60 * 60 * 1000,
    );
    const productionPriority =
      dto.productionSpeed === 'express' ? PRIORITY_EXPRESS : PRIORITY_STANDARD;

    const orderId = await generateOrderId(this.prisma);

    await this.prisma.$transaction(async (tx) => {
      // Serialize the first-order check and write for the same account/email.
      // Guest and signed-in checkouts share the email lock.
      const lockKeys = [
        ...(actor.customerId ? [`checkout:account:${actor.customerId}`] : []),
        `checkout:email:${checkoutEmail}`,
      ];
      for (const key of lockKeys) {
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      }
      const couponContext = {
        customerId: actor.customerId,
        isFirstOrder: await isFirstOrder(tx, checkoutEmail, actor.customerId),
        subtotal,
        items: pricedItems.map((p) => ({
          productId: p.dtoItem.productId,
          collectionSlugs: p.snapshot.collectionSlugs,
          lineTotal: p.lineTotal,
        })),
      };
      const code = dto.couponCode?.trim().toUpperCase();
      const couponResult = code && code !== WELCOME_CODE
        ? await this.couponsService.validate(code, couponContext, tx)
        : await this.couponsService.automaticWelcome(tx, couponContext);
      const discount = couponResult?.discountAmount ?? 0;
      const total = subtotal - discount + deliveryQuote.deliveryFee + deliveryQuote.expressFee;
      const giftCardResult = dto.giftCardCode
        ? await this.giftCardsService.validate(dto.giftCardCode, total, tx)
        : undefined;
      if (giftCardResult && giftCardResult.amountToApply < total) {
        throw new BadRequestException(
          'This gift card balance does not cover the full order total — partial gift card payment is not supported yet',
        );
      }
      const paidViaGiftCard = Boolean(giftCardResult);
      const paidStagesCount = paidViaGiftCard ? 2 : 1;
      await tx.order.create({
        data: {
          id: orderId,
          customerId: actor.customerId,
          customerEmail: checkoutEmail,
          status: paidViaGiftCard
            ? OrderStatus.payment_confirmed
            : OrderStatus.order_placed,
          paymentStatus: paidViaGiftCard ? 'paid' : 'pending',
          paymentMethod: paidViaGiftCard ? 'gift_card' : dto.paymentMethod,
          subtotal,
          deliveryFee: deliveryQuote.deliveryFee,
          expressFee: deliveryQuote.expressFee,
          discount,
          couponCode: couponResult?.code,
          total,
          productionSpeed: dto.productionSpeed,
          deliveryMethod,
          estimatedCompletion,
          estimatedDelivery,
          productionExpectedCompletionDate: estimatedCompletion,
          productionPriority,
          addressSnapshot: dto.address as unknown as Prisma.InputJsonValue,
          customizationStatus,
          items: {
            create: pricedItems.map((p) => ({
              productId: p.dtoItem.productId,
              productName: p.snapshot.name,
              productSlug: p.snapshot.slug,
              productImage: p.snapshot.image,
              sku: p.snapshot.sku,
              unitPrice: p.snapshot.unitPrice,
              size: p.dtoItem.size,
              color: p.dtoItem.color,
              quantity: p.dtoItem.quantity,
              fit: p.dtoItem.fit ?? null,
              customizations: p.dtoItem.customizations as Prisma.InputJsonValue,
              customizationCost: p.customizationCost,
              customOrder: p.dtoItem.customOrder as Prisma.InputJsonValue,
              measurementMode: p.dtoItem.measurement.mode,
              measurementProfileId: p.dtoItem.measurement.profileId,
              measurementValues: p.measurementValues as Prisma.InputJsonValue,
              measurementUnit: p.measurementUnit,
            })),
          },
          timeline: {
            create: stages.map((stage, i) => ({
              stage,
              date: now,
              complete: i < paidStagesCount,
              sortOrder: i,
              ...(i === 0 ? { actorId: actor.customerId, actorName } : {}),
            })),
          },
        },
      });

      const giftMessage = dto.giftMessage?.trim();
      if (dto.giftWrap || giftMessage) {
        await tx.orderNote.create({
          data: {
            orderId,
            audience: NoteAudience.customer,
            authorId: actor.customerId,
            authorName: actorName,
            message: [
              dto.giftWrap ? 'Gift order: please wrap.' : 'Gift order.',
              giftMessage ? `Message: "${giftMessage}"` : null,
            ]
              .filter(Boolean)
              .join(' '),
          },
        });
      }

      // Reserve stock for stock-tracked items now (see isStockTracked —
      // the same rule setPaymentStatus/cancel use); finalized (decremented
      // from stockQuantity) once payment is confirmed — either immediately
      // here (gift card paid in full) or later via setPaymentStatus
      // (provider payment confirmed asynchronously). Aggregated per product
      // and per product+size, each guarded by availability; a shortfall
      // throws and rolls the whole order back.
      const mode = paidViaGiftCard ? 'sell' : 'reserve';
      for (const entry of stockDemand.values()) {
        await takeStock(
          tx,
          {
            productId: entry.productId,
            name: entry.name,
            quantity: entry.quantity,
          },
          mode,
        );
        for (const [label, size] of entry.sizes) {
          await takeStock(
            tx,
            {
              productId: entry.productId,
              name: entry.name,
              quantity: size.quantity,
              size: label,
            },
            mode,
          );
        }
      }

      if (couponResult) {
        await this.couponsService.redeem(
          tx,
          couponResult.couponId,
          orderId,
          actor.customerId,
          discount,
        );
      }
      if (giftCardResult) {
        await this.giftCardsService.redeem(
          tx,
          giftCardResult.giftCardId,
          orderId,
          giftCardResult.amountToApply,
        );
      }
    });

    this.events.emit('order.created', { orderId });
    return this.findOneAdmin(orderId);
  }

  async findAllAdmin(filters: {
    status?: OrderStatus;
    customerId?: string;
    channel?: string;
  }) {
    const orders = await this.prisma.order.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.channel ? { channel: filters.channel as never } : {}),
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.serialize(o));
  }

  async findOneAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.serialize(order);
  }

  async findMineForCustomer(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.serialize(o));
  }

  async findOwned(id: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order || order.customerId !== customerId)
      throw new NotFoundException('Order not found');
    return this.serialize(order);
  }

  async confirmCustomization(id: string, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order || order.customerId !== customerId)
      throw new NotFoundException('Order not found');
    if (
      order.customizationStatus !==
      CustomizationApprovalStatus.awaiting_customer_confirmation
    ) {
      throw new BadRequestException(
        'This customization is not awaiting customer confirmation',
      );
    }
    await this.prisma.order.update({
      where: { id },
      data: { customizationStatus: CustomizationApprovalStatus.confirmed },
    });
    this.events.emit('order.customization_confirmed', { orderId: id });
    return this.findOwned(id, customerId);
  }

  async trackGuestOrder(id: string, email: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (
      !order ||
      order.customerEmail.toLowerCase() !== email.trim().toLowerCase()
    )
      throw new NotFoundException('Order not found');
    return this.serialize(order);
  }

  /** Shared by `updateStatus` and `setPaymentStatus` (the latter needs to
   * advance the timeline too when a provider payment lands, not just flip
   * `paymentStatus` — see that method's comment). `timeline` must already be
   * sorted by `sortOrder`; stages before the target become complete, stages
   * after become incomplete, and a status with no matching stage (an
   * exception status like `cancelled`) just sets `Order.status` and leaves
   * the linear timeline untouched. */
  private async advanceTimelineAndStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
    timeline: { id: string; stage: OrderStatus }[],
    newStatus: OrderStatus,
    actor: OrderActor,
    message?: string,
  ) {
    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    const stageIdx = timeline.findIndex((t) => t.stage === newStatus);
    if (stageIdx === -1) return;

    await Promise.all(
      timeline.map((t, i) =>
        tx.orderTimelineEntry.update({
          where: { id: t.id },
          data:
            i <= stageIdx
              ? {
                  complete: true,
                  actorId: actor.id,
                  actorName: actor.name,
                  ...(i === stageIdx ? { message } : {}),
                }
              : { complete: false },
        }),
      ),
    );
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, actor: OrderActor) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { timeline: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.$transaction((tx) =>
      this.advanceTimelineAndStatus(
        tx,
        id,
        order.timeline,
        dto.status,
        actor,
        dto.message,
      ),
    );

    this.events.emit('order.status_changed', {
      orderId: id,
      status: dto.status,
    });
    return this.findOneAdmin(id);
  }

  async addNote(id: string, dto: AddOrderNoteDto, actor: OrderActor) {
    await this.findOneAdmin(id);
    await this.prisma.orderNote.create({
      data: {
        orderId: id,
        audience: dto.audience,
        authorId: actor.id,
        authorName: actor.name,
        message: dto.message,
      },
    });
    return this.findOneAdmin(id);
  }

  async updateProduction(id: string, dto: UpdateOrderProductionDto) {
    await this.findOneAdmin(id);
    if (dto.assignedStaffId)
      await this.productionStaffService.findOne(dto.assignedStaffId); // 404s cleanly instead of a raw FK violation
    await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.assignedStaffId !== undefined
          ? { assignedStaffId: dto.assignedStaffId }
          : {}),
        ...(dto.priority !== undefined
          ? { productionPriority: dto.priority }
          : {}),
        ...(dto.startDate !== undefined
          ? { productionStartDate: new Date(dto.startDate) }
          : {}),
        ...(dto.expectedCompletionDate !== undefined
          ? {
              productionExpectedCompletionDate: new Date(
                dto.expectedCompletionDate,
              ),
            }
          : {}),
        ...(dto.actualCompletionDate !== undefined
          ? {
              productionActualCompletionDate: new Date(
                dto.actualCompletionDate,
              ),
            }
          : {}),
      },
    });
    return this.findOneAdmin(id);
  }

  async updateCustomizationStatus(
    id: string,
    dto: UpdateCustomizationStatusDto,
    actor: OrderActor,
  ) {
    const order = await this.findOneAdmin(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { customizationStatus: dto.status },
      });
      if (dto.note) {
        await tx.orderNote.create({
          data: {
            orderId: id,
            audience: NoteAudience.internal,
            authorId: actor.id,
            authorName: actor.name,
            message: dto.note,
          },
        });
      }
    });

    if (dto.status === CustomizationApprovalStatus.clarification_requested) {
      this.events.emit('order.clarification_requested', {
        orderId: id,
        customerEmail: order.customerEmail,
      });
    }
    return this.findOneAdmin(id);
  }

  /** Payment confirmation converts a soft stock reservation into a real
   * decrement; failure/cancellation releases the reservation instead. Every
   * other status transition leaves stock untouched.
   *
   * Atomic and idempotent: the provider's redirect (GET /payments/verify)
   * and its webhook routinely land at the same moment. The paymentStatus
   * flip is a compare-and-swap inside the transaction, so exactly one caller
   * performs the stock changes and emits `order.payment_status_changed`
   * (which sends the "paid" email); the other sees no change and does
   * nothing. */
  async setPaymentStatus(
    id: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded',
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, timeline: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Payment confirmation landing here (from a provider webhook/verify
    // call, asynchronously — see PaymentsService) advances the timeline to
    // payment_confirmed with a system actor. Guarded to only move forward
    // from order_placed / payment_failed (a successful retry after a failed
    // attempt) so it never regresses an order an admin has already pushed
    // further along.
    const systemActor: OrderActor = { name: 'System' };

    let changed = false;
    // Retried only if another writer changed paymentStatus between our read
    // and our compare-and-swap; settles in one pass in practice.
    for (let attempt = 0; attempt < 3 && !changed; attempt++) {
      const current =
        attempt === 0
          ? order.paymentStatus
          : (
              await this.prisma.order.findUniqueOrThrow({
                where: { id },
                select: { paymentStatus: true },
              })
            ).paymentStatus;
      if (current === status) break;

      changed = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.order.updateMany({
          where: { id, paymentStatus: current },
          data: { paymentStatus: status },
        });
        if (count !== 1) return false;

        // Row is now locked by this transaction; read the status as of now
        // (a concurrent cancel may have committed since our first read).
        const { status: orderStatus } = await tx.order.findUniqueOrThrow({
          where: { id },
          select: { status: true },
        });
        const cancelled = orderStatus === OrderStatus.cancelled;

        if (status === 'paid') {
          // A cancelled order's reservation was released by cancel() (and a
          // failed attempt's by the failed branch below), so only a still-
          // pending, live order holds one to convert.
          if (!cancelled && current === 'pending')
            await convertReservations(tx, order.items);
          else if (!cancelled && current === 'failed')
            await decrementStock(tx, order.items);

          if (
            orderStatus === OrderStatus.order_placed ||
            orderStatus === OrderStatus.payment_failed
          ) {
            await this.advanceTimelineAndStatus(
              tx,
              id,
              order.timeline,
              OrderStatus.payment_confirmed,
              systemActor,
            );
          }
        } else if (status === 'failed' && current === 'pending' && !cancelled) {
          await releaseReservations(tx, order.items);
          await tx.order.updateMany({
            where: { id, status: OrderStatus.order_placed },
            data: { status: OrderStatus.payment_failed },
          });
        } else if (status === 'pending' && current === 'failed' && !cancelled) {
          await reReserve(tx, order.items);
        }
        return true;
      });
    }

    if (changed) {
      this.events.emit('order.payment_status_changed', {
        orderId: id,
        paymentStatus: status,
      });
      // Released or sold stock may change what's available for alerts.
      order.items.forEach(
        (item) =>
          item.productId &&
          this.events.emit('product.changed', { productId: item.productId }),
      );
    }
    return this.findOneAdmin(id);
  }

  async cancel(id: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const released = await this.prisma.$transaction(async (tx) => {
      const data = {
        status: OrderStatus.cancelled,
        cancelledAt: new Date(),
        cancelledReason: reason,
      };
      // Only a still-pending, not-yet-cancelled order holds a reservation:
      // paid orders sold their stock, and failed ones already released it.
      // Conditional on the row's current values so a concurrent payment
      // update or a double-click cancel can't release twice.
      const pending = await tx.order.updateMany({
        where: {
          id,
          status: { not: OrderStatus.cancelled },
          paymentStatus: 'pending',
        },
        data,
      });
      if (pending.count === 1) {
        await releaseReservations(tx, order.items);
        return true;
      }
      await tx.order.updateMany({
        where: { id, status: { not: OrderStatus.cancelled } },
        data,
      });
      return false;
    });

    if (released)
      order.items.forEach(
        (item) =>
          item.productId &&
          this.events.emit('product.changed', { productId: item.productId }),
      );
    return this.findOneAdmin(id);
  }

  async duplicate(id: string) {
    const source = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, timeline: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!source) throw new NotFoundException('Order not found');

    // Reuse the source order's own stage sequence rather than recomputing it
    // from item data — recomputing would need per-item made-to-measure/
    // custom-order flags that aren't stored on OrderLineItem, and guessing
    // wrong would silently drop the measurement or customization-review
    // stages for the duplicate.
    const stages = source.timeline.length
      ? source.timeline.map((t) => t.stage)
      : [OrderStatus.order_placed];

    const newId = await generateOrderId(this.prisma);
    const now = new Date();

    // Re-resolving the timeline rules would mean re-fetching every line
    // item's product for its garment/collection (OrderLineItem doesn't
    // store those) just to feed the resolver again. Cheaper and just as
    // reasonable: reuse how many days the source order was itself given,
    // measured from its own creation, and apply that same duration from now.
    const estimatedCompletion =
      source.productionExpectedCompletionDate && source.createdAt
        ? new Date(
            now.getTime() +
              (source.productionExpectedCompletionDate.getTime() -
                source.createdAt.getTime()),
          )
        : undefined;

    await this.prisma.order.create({
      data: {
        id: newId,
        customerId: source.customerId,
        customerEmail: source.customerEmail,
        status: OrderStatus.order_placed,
        paymentStatus: 'pending',
        subtotal: source.subtotal,
        deliveryFee: source.deliveryFee,
        expressFee: source.expressFee,
        discount: source.discount,
        total: source.total,
        productionSpeed: source.productionSpeed,
        estimatedCompletion,
        productionExpectedCompletionDate: estimatedCompletion,
        addressSnapshot: source.addressSnapshot as Prisma.InputJsonValue,
        channel: 'admin',
        productionPriority:
          source.productionSpeed === 'express'
            ? PRIORITY_EXPRESS
            : PRIORITY_STANDARD,
        items: {
          create: source.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSlug: i.productSlug,
            productImage: i.productImage,
            sku: i.sku,
            unitPrice: i.unitPrice,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            fit: i.fit,
            customizations: i.customizations as Prisma.InputJsonValue,
            customizationCost: i.customizationCost,
            customOrder: i.customOrder as Prisma.InputJsonValue,
            measurementMode: i.measurementMode,
            measurementValues: i.measurementValues as Prisma.InputJsonValue,
            measurementUnit: i.measurementUnit,
          })),
        },
        timeline: {
          create: stages.map((stage, idx) => ({
            stage,
            date: now,
            complete: idx === 0,
            sortOrder: idx,
          })),
        },
      },
    });

    return this.findOneAdmin(newId);
  }
}
