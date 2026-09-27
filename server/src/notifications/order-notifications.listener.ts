import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationEvent, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

// Only these OrderStatus transitions have a corresponding NotificationEvent
// — the rest (customization_review, production_queue, quality_check,
// exception statuses other than payment_failed, ...) don't notify by design.
const STATUS_TO_EVENT: Partial<Record<OrderStatus, NotificationEvent>> = {
  [OrderStatus.measurements_confirmed]:
    NotificationEvent.measurements_submitted,
  [OrderStatus.in_production]: NotificationEvent.order_in_production,
  [OrderStatus.ready_for_dispatch]: NotificationEvent.production_completed,
  [OrderStatus.shipped]: NotificationEvent.order_shipped,
  [OrderStatus.delivered]: NotificationEvent.order_delivered,
};

/**
 * Bridges OrdersService/RefundsService/CustomerAuthService's domain events
 * (emitted via EventEmitter2 — see e.g. `this.events.emit('order.created', ...)`
 * in orders.service.ts) to NotificationsService.dispatch. Deliberately its
 * own listener rather than notification calls sprinkled through each
 * service — this is the one place that knows "order event X means
 * NotificationEvent Y," so that mapping isn't duplicated or drifted.
 */
@Injectable()
export class OrderNotificationsListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('order.created')
  async onOrderCreated({ orderId }: { orderId: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) return;
    await this.notifications.dispatch(
      NotificationEvent.order_placed,
      order.customerEmail,
      { orderNumber: order.id },
    );
  }

  @OnEvent('order.status_changed')
  async onOrderStatusChanged({
    orderId,
    status,
  }: {
    orderId: string;
    status: OrderStatus;
  }) {
    const event = STATUS_TO_EVENT[status];
    if (!event) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) return;
    await this.notifications.dispatch(event, order.customerEmail, {
      orderNumber: order.id,
    });
  }

  @OnEvent('order.payment_status_changed')
  async onPaymentStatusChanged({
    orderId,
    paymentStatus,
  }: {
    orderId: string;
    paymentStatus: string;
  }) {
    if (paymentStatus !== 'paid' && paymentStatus !== 'failed') return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) return;
    const event =
      paymentStatus === 'paid'
        ? NotificationEvent.payment_successful
        : NotificationEvent.payment_failed;
    await this.notifications.dispatch(event, order.customerEmail, {
      orderNumber: order.id,
    });
  }

  @OnEvent('order.clarification_requested')
  async onClarificationRequested({
    orderId,
    customerEmail,
  }: {
    orderId: string;
    customerEmail: string;
  }) {
    await this.notifications.dispatch(
      NotificationEvent.customization_clarification_requested,
      customerEmail,
      { orderNumber: orderId },
    );
  }

  @OnEvent('refund.processed')
  async onRefundProcessed({ orderId }: { orderId: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) return;
    await this.notifications.dispatch(
      NotificationEvent.refund_processed,
      order.customerEmail,
      { orderNumber: order.id },
    );
  }

  @OnEvent('customer.created')
  async onCustomerCreated({
    customerEmail,
    customerName,
  }: {
    customerEmail: string;
    customerName: string;
  }) {
    await this.notifications.dispatch(
      NotificationEvent.account_created,
      customerEmail,
      { customerName },
    );
  }
}
