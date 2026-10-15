import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../catalog/products/products.service';

/** One stored line: references only. Product data and prices are re-read
 * from the catalogue on every fetch, so a stored bag can never carry a
 * stale or tampered price. */
export interface StoredCartLine {
  id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  measurement?: unknown;
  customizations?: Record<string, string>;
  customOrder?: unknown;
}

const MAX_LINES = 50;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  async get(customerId: string) {
    const cart = await this.prisma.customerCart.findUnique({ where: { customerId } });
    const lines = (cart?.items as unknown as StoredCartLine[] | undefined) ?? [];
    return { items: await this.hydrate(lines), updatedAt: cart?.updatedAt.toISOString() };
  }

  async replace(customerId: string, lines: StoredCartLine[]) {
    const clean = sanitize(lines);
    await this.prisma.customerCart.upsert({
      where: { customerId },
      create: { customerId, items: clean as unknown as Prisma.InputJsonValue },
      update: { items: clean as unknown as Prisma.InputJsonValue },
    });
    return this.get(customerId);
  }

  /** Attaches the live product to each line; drops lines whose product is
   * gone or unpublished. Customization cost is recomputed server-side. */
  private async hydrate(lines: StoredCartLine[]) {
    const out = [];
    for (const line of lines) {
      try {
        const product = await this.products.findOnePublishedById(line.productId);
        if (!product) continue;
        const snapshot = await this.products.getPricingSnapshot(line.productId);
        let customizationCost = 0;
        for (const [groupId, choiceId] of Object.entries(line.customizations ?? {})) {
          customizationCost += snapshot.getChoiceCost(groupId, choiceId);
        }
        const fabricId = (line.customOrder as { fabricId?: string } | undefined)?.fabricId;
        if (fabricId) customizationCost += snapshot.getFabricCost(fabricId);
        out.push({ ...line, product, customizationCost: customizationCost || undefined });
      } catch {
        // product removed — skip the line
      }
    }
    return out;
  }
}

function sanitize(lines: StoredCartLine[]): StoredCartLine[] {
  return (Array.isArray(lines) ? lines : [])
    .filter((l) => l && typeof l.productId === 'string' && typeof l.size === 'string')
    .slice(0, MAX_LINES)
    .map((l) => ({
      id: String(l.id).slice(0, 120),
      productId: l.productId,
      size: String(l.size).slice(0, 60),
      color: String(l.color ?? '').slice(0, 60),
      quantity: Math.min(20, Math.max(1, Math.floor(Number(l.quantity) || 1))),
      measurement: l.measurement,
      customizations: l.customizations,
      customOrder: l.customOrder,
    }));
}
