import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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
import { CouponsService } from '../../promotions/coupons/coupons.service';
import { GiftCardsService } from '../../promotions/gift-cards/gift-cards.service';
import { generateOrderId } from './order-id.util';
import { isCustomOrderRequest, stagesForItems } from './order-stages.util';
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

/** Mirrors a product-level stock change onto the matching size row, when
 * that size is tracked individually (stockQuantity not null). */
async function adjustSizeStock(
  tx: Prisma.TransactionClient,
  productId: string,
  size: string,
  data: Prisma.ProductSizeUpdateManyMutationInput,
) {
  await tx.productSize.updateMany({
    where: { productId, label: size, stockQuantity: { not: null } },
    data,
  });
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
          unit: item.measurementUnit ?? undefined,
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

    const pricedItems = await Promise.all(
      dto.items.map(async (item) => {
        const snapshot = await this.productsService.getPricingSnapshot(
          item.productId,
        );
        if (!snapshot.isEffectivelyPublished)
          throw new BadRequestException(
            `Product ${item.productId} is not available`,
          );

        const isMadeToMeasure =
          snapshot.sizingMode === 'made_to_measure' ||
          snapshot.sizingMode === 'both';
        if (snapshot.sizingMode !== 'made_to_measure') {
          const available = snapshot.stockQuantity - snapshot.reservedQuantity;
          if (available < item.quantity)
            throw new BadRequestException(
              `Insufficient stock for product ${item.productId}`,
            );
          const sizeAvailable = snapshot.sizeAvailable(item.size);
          if (sizeAvailable !== undefined && sizeAvailable < item.quantity)
            throw new BadRequestException(
              `${snapshot.name} in size ${item.size} is out of stock`,
            );
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
        }

        return {
          dtoItem: item,
          snapshot,
          isMadeToMeasure,
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

    const subtotal = pricedItems.reduce((sum, i) => sum + i.lineTotal, 0);

    // Validated and priced server-side — never trusts a client-computed
    // discount. Rejecting an invalid/expired/ineligible code here (rather
    // than silently dropping it) means "the coupon didn't apply" is never
    // silent; CouponsService.validate throws a customer-facing reason.
    const couponResult = dto.couponCode
      ? await this.couponsService.validate(dto.couponCode, {
          customerId: actor.customerId,
          isFirstOrder: actor.customerId
            ? (await this.prisma.order.count({
                where: { customerId: actor.customerId },
              })) === 0
            : false,
          subtotal,
          items: pricedItems.map((p) => ({
            productId: p.dtoItem.productId,
            collectionSlugs: p.snapshot.collectionSlugs,
            lineTotal: p.lineTotal,
          })),
        })
      : undefined;
    const discount = couponResult?.discountAmount ?? 0;

    // Replaces trusting deliveryFee/expressFee as client input — resolved
    // from DeliveryZone data matched against the destination country.
    const deliveryMethod = dto.deliveryMethod ?? 'delivery';
    const deliveryQuote = await this.deliveryZonesService.quote(
      dto.address.country,
      dto.productionSpeed,
      subtotal,
      deliveryMethod,
    );
    const total =
      subtotal -
      discount +
      deliveryQuote.deliveryFee +
      deliveryQuote.expressFee;

    // Gift cards only cover the *entire* order for now — Order has a single
    // `paymentMethod`, not a split-tender breakdown, so a gift card that
    // doesn't fully cover the total is rejected rather than silently
    // covering part of it and leaving the rest unaccounted for.
    const giftCardResult = dto.giftCardCode
      ? await this.giftCardsService.validate(dto.giftCardCode, total)
      : undefined;
    if (giftCardResult && giftCardResult.amountToApply < total) {
      throw new BadRequestException(
        'This gift card balance does not cover the full order total — partial gift card payment is not supported yet',
      );
    }
    const paidViaGiftCard = Boolean(giftCardResult);

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

    // Paying in full with a gift card settles the order immediately — no
    // provider round trip needed, so payment_confirmed is already complete.
    const paidStagesCount = paidViaGiftCard ? 2 : 1;

    const orderId = await generateOrderId(this.prisma);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          id: orderId,
          customerId: actor.customerId,
          customerEmail: customerEmail!,
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
              customizations: p.dtoItem.customizations as Prisma.InputJsonValue,
              customizationCost: p.customizationCost,
              customOrder: p.dtoItem.customOrder as Prisma.InputJsonValue,
              measurementMode: p.dtoItem.measurement.mode,
              measurementProfileId: p.dtoItem.measurement.profileId,
              measurementValues: p.measurementValues as Prisma.InputJsonValue,
              measurementUnit: p.dtoItem.measurement.unit,
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

      // Reserve stock for made-to-order-able items now; finalized
      // (decremented from stockQuantity) once payment is confirmed — either
      // immediately here (gift card paid in full) or later via
      // setPaymentStatus (provider payment confirmed asynchronously).
      for (const p of pricedItems) {
        if (p.snapshot.sizingMode === 'made_to_measure') continue;
        await tx.product.update({
          where: { id: p.dtoItem.productId },
          data: paidViaGiftCard
            ? { stockQuantity: { decrement: p.dtoItem.quantity } }
            : { reservedQuantity: { increment: p.dtoItem.quantity } },
        });
        await adjustSizeStock(
          tx,
          p.dtoItem.productId,
          p.dtoItem.size,
          paidViaGiftCard
            ? { stockQuantity: { decrement: p.dtoItem.quantity } }
            : { reservedQuantity: { increment: p.dtoItem.quantity } },
        );
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
   * other status transition leaves stock untouched. */
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
    // call, asynchronously — see PaymentsService) used to only ever touch
    // `paymentStatus`, never `status`/the timeline. That left every
    // provider-paid order stuck showing "Order Placed" until an admin
    // manually advanced it, even though the payment had actually gone
    // through. System-actor timeline advancement fixes that; it's guarded
    // to only move forward from `order_placed` so it never regresses an
    // order an admin has already pushed further along.
    const systemActor: OrderActor = { name: 'System' };

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { paymentStatus: status } });

      if (status === 'paid' && order.paymentStatus !== 'paid') {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.product
            .update({
              where: { id: item.productId },
              data: {
                stockQuantity: { decrement: item.quantity },
                reservedQuantity: { decrement: item.quantity },
              },
            })
            .catch(() => undefined);
          await adjustSizeStock(tx, item.productId, item.size, {
            stockQuantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          });
        }
        if (order.status === OrderStatus.order_placed) {
          await this.advanceTimelineAndStatus(
            tx,
            id,
            order.timeline,
            OrderStatus.payment_confirmed,
            systemActor,
          );
        }
      } else if (status === 'failed' && order.paymentStatus !== 'failed') {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.product
            .update({
              where: { id: item.productId },
              data: { reservedQuantity: { decrement: item.quantity } },
            })
            .catch(() => undefined);
          await adjustSizeStock(tx, item.productId, item.size, {
            reservedQuantity: { decrement: item.quantity },
          });
        }
        await tx.order.update({
          where: { id },
          data: { status: OrderStatus.payment_failed },
        });
      }
    });

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
    return this.findOneAdmin(id);
  }

  async cancel(id: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.cancelled,
          cancelledAt: new Date(),
          cancelledReason: reason,
        },
      });
      if (order.paymentStatus !== 'paid') {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.product
            .update({
              where: { id: item.productId },
              data: { reservedQuantity: { decrement: item.quantity } },
            })
            .catch(() => undefined);
          await adjustSizeStock(tx, item.productId, item.size, {
            reservedQuantity: { decrement: item.quantity },
          });
        }
      }
    });

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
