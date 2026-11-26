import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderChannel, OrderStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders/orders.service';
import { PaymentsService } from './payments.service';

/** Web orders still unpaid this long after their last payment attempt give
 * their reserved stock back, so abandoned checkouts (or someone ordering
 * everything and never paying) can't make the shop look sold out. Each one is
 * re-checked with the provider first, so a payment whose webhook was missed is
 * marked paid rather than failed. The customer gets the usual "payment failed"
 * email and can still pay from their order page, which reserves stock again. */
const DEFAULT_TTL_MINUTES = 60;
const SWEEP_EVERY_MS = 5 * 60 * 1000;
const BATCH = 50;

@Injectable()
export class UnpaidOrderSweeper implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(UnpaidOrderSweeper.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sweep(), SWEEP_EVERY_MS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  private get ttlMinutes() {
    const value = Number(this.config.get('UNPAID_ORDER_TTL_MINUTES'));
    return Number.isFinite(value) && value >= 15 ? value : DEFAULT_TTL_MINUTES;
  }

  async sweep(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let released = 0;
    try {
      const cutoff = new Date(now.getTime() - this.ttlMinutes * 60 * 1000);
      const stale = await this.prisma.order.findMany({
        where: {
          channel: OrderChannel.web,
          status: OrderStatus.order_placed,
          paymentStatus: 'pending',
          // Cash on delivery and manual transfers are settled offline.
          OR: [{ paymentMethod: null }, { paymentMethod: { in: [PaymentMethod.card, PaymentMethod.gift_card] } }],
          createdAt: { lt: cutoff },
          transactions: { none: { createdAt: { gte: cutoff } } },
        },
        select: { id: true, transactions: { where: { status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 1, select: { providerRef: true } } },
        orderBy: { createdAt: 'asc' },
        take: BATCH,
      });
      for (const order of stale) {
        try {
          const reference = order.transactions[0]?.providerRef;
          if (reference) {
            const result = await this.payments.verifyAndSync(reference).catch(() => undefined);
            if (result?.status === 'paid') continue;
          }
          const { paymentStatus } = await this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { paymentStatus: true } });
          if (paymentStatus !== 'pending') continue;
          await this.orders.setPaymentStatus(order.id, 'failed');
          released++;
        } catch (error) {
          this.logger.warn(`Could not release unpaid order ${order.id}: ${error instanceof Error ? error.message : error}`);
        }
      }
      if (released) this.logger.log(`Released stock from ${released} unpaid order(s).`);
    } finally {
      this.running = false;
    }
    return released;
  }
}
