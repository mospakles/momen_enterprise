import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { StockAlertKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSenderService } from '../notifications/email-sender.service';
import type { CreateStockAlertDto } from './dto/create-stock-alert.dto';

/** "Tell me when it's back" and "tell me if the price drops" requests.
 * Checked whenever a product changes (admin edit, released reservations);
 * each alert is sent once, then marked notified. */
@Injectable()
export class StockAlertsService {
  private readonly logger = new Logger(StockAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailSenderService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateStockAlertDto, customerId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.stockAlert.findFirst({
      where: { productId: dto.productId, email, kind: dto.kind, size: dto.size ?? null, notifiedAt: null },
    });
    if (existing) return { id: existing.id, created: false };
    const alert = await this.prisma.stockAlert.create({
      data: {
        productId: dto.productId,
        email,
        customerId,
        kind: dto.kind,
        size: dto.size,
        color: dto.color,
        priceAtSignup: dto.kind === StockAlertKind.price_drop ? product.salePrice ?? product.price : undefined,
      },
    });
    return { id: alert.id, created: true };
  }

  findAllAdmin() {
    return this.prisma.stockAlert
      .findMany({
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          productId: r.productId,
          productName: r.product.name,
          productSlug: r.product.slug,
          email: r.email,
          kind: r.kind,
          size: r.size ?? undefined,
          color: r.color ?? undefined,
          priceAtSignup: r.priceAtSignup ? Number(r.priceAtSignup) : undefined,
          notifiedAt: r.notifiedAt?.toISOString(),
          createdAt: r.createdAt.toISOString(),
        })),
      );
  }

  @OnEvent('product.changed', { async: true })
  async onProductChanged({ productId }: { productId: string }) {
    try {
      await this.check(productId);
    } catch (error) {
      this.logger.error(`Stock alert check failed for ${productId}`, error as Error);
    }
  }

  /** Sends any alerts whose condition is now met. */
  async check(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { sizes: true },
    });
    if (!product || product.publishStatus !== 'published') return { sent: 0 };
    const pending = await this.prisma.stockAlert.findMany({ where: { productId, notifiedAt: null } });
    if (pending.length === 0) return { sent: 0 };

    const price = Number(product.salePrice ?? product.price);
    const productAvailable = product.stockQuantity - product.reservedQuantity;
    const availableFor = (size: string | null) => {
      const row = size ? product.sizes.find((s) => s.label === size && s.stockQuantity !== null) : undefined;
      return row ? (row.stockQuantity ?? 0) - row.reservedQuantity : productAvailable;
    };
    const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const url = `${frontend}/product/${product.slug}`;
    const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

    let sent = 0;
    for (const alert of pending) {
      let subject: string | null = null;
      let body = '';
      if (alert.kind === StockAlertKind.back_in_stock && availableFor(alert.size) > 0) {
        subject = `${product.name} is back`;
        body = `Good news — ${product.name}${alert.size ? ` in size ${alert.size}` : ''} is back in stock at momen.\n\nIt won't be here long: ${url}\n\n— The house of momen.`;
      } else if (alert.kind === StockAlertKind.price_drop && alert.priceAtSignup && price < Number(alert.priceAtSignup)) {
        subject = `${product.name} is now ${naira(price)}`;
        body = `The ${product.name} you saved has dropped from ${naira(Number(alert.priceAtSignup))} to ${naira(price)}.\n\n${url}\n\n— The house of momen.`;
      }
      if (!subject) continue;
      const result = await this.email.send(alert.email, subject, body);
      if (result.success) {
        await this.prisma.stockAlert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } });
        sent++;
      }
    }
    return { sent };
  }
}
