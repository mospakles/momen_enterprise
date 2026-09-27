import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// The pipeline stages a "queue" view is actually useful for — before
// production_queue an order isn't production's problem yet (still awaiting
// payment/measurements/customization sign-off), and once shipped/delivered/
// cancelled it's no longer active work.
const QUEUE_STATUSES: OrderStatus[] = [
  OrderStatus.production_queue,
  OrderStatus.in_production,
  OrderStatus.quality_check,
  OrderStatus.ready_for_dispatch,
];

@Injectable()
export class ProductionQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async findQueue(filters: {
    assignedStaffId?: string;
    overdueOnly?: boolean;
  }) {
    const where: Prisma.OrderWhereInput = {
      status: { in: QUEUE_STATUSES },
      ...(filters.assignedStaffId
        ? { assignedStaffId: filters.assignedStaffId }
        : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: { select: { productName: true, sku: true, quantity: true } },
        assignedStaff: { select: { id: true, name: true, role: true } },
      },
      orderBy: [
        { productionPriority: 'desc' },
        { productionExpectedCompletionDate: 'asc' },
      ],
    });

    const now = new Date();
    const withOverdue = orders.map((order) => ({
      id: order.id,
      status: order.status,
      productionSpeed: order.productionSpeed,
      priority: order.productionPriority,
      startDate: order.productionStartDate?.toISOString(),
      expectedCompletionDate:
        order.productionExpectedCompletionDate?.toISOString(),
      actualCompletionDate: order.productionActualCompletionDate?.toISOString(),
      assignedStaff: order.assignedStaff,
      items: order.items,
      // Overdue = past its expected date, not yet finished, and not already
      // sitting at "ready for dispatch" (finishing production is what the
      // deadline was for — once it's dispatch-ready, being on the shelf a
      // little longer isn't a production delay).
      overdue: Boolean(
        order.productionExpectedCompletionDate &&
        order.productionExpectedCompletionDate < now &&
        !order.productionActualCompletionDate &&
        order.status !== OrderStatus.ready_for_dispatch,
      ),
    }));

    return filters.overdueOnly
      ? withOverdue.filter((o) => o.overdue)
      : withOverdue;
  }
}
