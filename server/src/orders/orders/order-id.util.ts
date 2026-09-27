import { PrismaService } from '../../prisma/prisma.service';

/** Human-readable order codes ("MOM-482913") are the primary key — see the
 * schema's note on `Order.id`. Collision odds are ~1 in 900,000 per
 * attempt, but checked anyway since it's the primary key. */
export async function generateOrderId(prisma: PrismaService): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = `MOM-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return id;
  }
  throw new Error('Could not generate a unique order id');
}
