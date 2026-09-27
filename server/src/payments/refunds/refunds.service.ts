import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, RefundStatus, RefundType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { OrdersService } from '../../orders/orders/orders.service';
import { PaymentsService } from '../payments.service';
import type { RequestRefundDto } from './dto/request-refund.dto';

interface Actor {
  id?: string;
  name: string;
}

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly auditLog: AuditLogService,
    private readonly events: EventEmitter2,
  ) {}

  findAll(status?: RefundStatus) {
    return this.prisma.refund.findMany({
      where: status ? { status } : {},
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) throw new NotFoundException('Refund not found');
    return refund;
  }

  async request(
    orderId: string,
    dto: RequestRefundDto,
    actor: Actor,
    requesterCustomerId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (requesterCustomerId && order.customerId !== requesterCustomerId)
      throw new ForbiddenException('Not your order');
    if (
      order.paymentStatus !== 'paid' &&
      order.paymentStatus !== 'partially_refunded'
    ) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    // Every non-rejected refund (requested/approved/processed) is a real
    // claim against what was paid, even before it's actually processed —
    // otherwise two refund requests raised back-to-back could each pass a
    // "does this exceed the order total" check individually and together
    // claim more than the customer ever paid.
    const existingRefunds = await this.prisma.refund.findMany({
      where: { orderId, status: { not: RefundStatus.rejected } },
    });
    const alreadyClaimed = existingRefunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    const remaining = Number(order.total) - alreadyClaimed;

    const amount = dto.type === RefundType.full ? remaining : dto.amount;
    if (!amount || amount <= 0) {
      throw new BadRequestException(
        remaining <= 0
          ? 'No refundable balance remains on this order'
          : 'amount is required for a partial refund',
      );
    }
    if (amount > remaining) {
      throw new BadRequestException(
        `Refund amount exceeds the remaining refundable balance (${remaining})`,
      );
    }

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        amount,
        type: dto.type,
        reason: dto.reason,
        requestedById: actor.id,
        requestedByName: actor.name,
      },
    });

    await this.ordersService.updateStatus(
      orderId,
      { status: OrderStatus.refund_requested },
      actor,
    );
    return refund;
  }

  async approve(id: string, actor: Actor) {
    const refund = await this.findOne(id);
    if (refund.status !== RefundStatus.requested)
      throw new BadRequestException(`Refund is already ${refund.status}`);
    const updated = await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.approved,
        processedById: actor.id,
        processedByName: actor.name,
      },
    });

    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'refund.approve',
      resource: 'refunds',
      resourceId: id,
      summary: `Approved a ${refund.type} refund of ${refund.amount} on order ${refund.orderId}`,
    });
    return updated;
  }

  async reject(id: string, reason: string, actor: Actor) {
    const refund = await this.findOne(id);
    if (refund.status !== RefundStatus.requested)
      throw new BadRequestException(`Refund is already ${refund.status}`);
    const updated = await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.rejected,
        internalNotes: reason,
        processedById: actor.id,
        processedByName: actor.name,
      },
    });

    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'refund.reject',
      resource: 'refunds',
      resourceId: id,
      summary: `Rejected a ${refund.type} refund of ${refund.amount} on order ${refund.orderId}: ${reason}`,
    });
    return updated;
  }

  /** Approve → process are separate steps on purpose — approve is a
   * decision, process is the (irreversible, provider-charged) action. */
  async process(id: string, actor: Actor) {
    const refund = await this.findOne(id);
    if (refund.status !== RefundStatus.approved)
      throw new BadRequestException(
        'Refund must be approved before it can be processed',
      );

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { orderId: refund.orderId, status: 'paid' },
      orderBy: { createdAt: 'desc' },
    });
    if (!transaction)
      throw new BadRequestException(
        'No successful payment transaction found for this order',
      );

    const adapter = this.paymentsService.getAdapter(transaction.provider);
    const result = await adapter.refund(
      transaction.providerRef,
      refund.type === RefundType.partial ? Number(refund.amount) : undefined,
    );

    const processed = await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.processed,
        providerRefundRef: result.refundRef,
        processedById: actor.id,
        processedByName: actor.name,
        processedAt: new Date(),
      },
    });

    const newOrderStatus =
      refund.type === RefundType.full
        ? OrderStatus.refunded
        : OrderStatus.partially_refunded;
    await this.ordersService.setPaymentStatus(
      refund.orderId,
      refund.type === RefundType.full ? 'refunded' : 'partially_refunded',
    );
    await this.ordersService.updateStatus(
      refund.orderId,
      { status: newOrderStatus },
      actor,
    );

    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'refund.process',
      resource: 'refunds',
      resourceId: id,
      summary: `Processed a ${refund.type} refund of ${refund.amount} on order ${refund.orderId} via ${transaction.provider}`,
      after: { providerRefundRef: result.refundRef },
    });

    this.events.emit('refund.processed', {
      orderId: refund.orderId,
      refundId: refund.id,
    });
    return processed;
  }
}
