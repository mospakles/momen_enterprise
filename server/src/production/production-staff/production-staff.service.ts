import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertProductionStaffDto } from './dto/upsert-production-staff.dto';

// An assignment "counts" toward a staff member's active load while the order
// is still somewhere in the production pipeline — not yet dispatched, and
// not an exception state that's taken it out of the flow.
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.production_queue,
  OrderStatus.in_production,
  OrderStatus.quality_check,
];

@Injectable()
export class ProductionStaffService {
  constructor(private readonly prisma: PrismaService) {}

  private async withActiveOrders<T extends { id: string }>(staff: T[]) {
    const counts = await this.prisma.order.groupBy({
      by: ['assignedStaffId'],
      where: {
        assignedStaffId: { in: staff.map((s) => s.id) },
        status: { in: ACTIVE_ORDER_STATUSES },
      },
      _count: { _all: true },
    });
    const countByStaffId = new Map(
      counts.map((c) => [c.assignedStaffId, c._count._all]),
    );
    return staff.map((s) => ({
      ...s,
      activeOrders: countByStaffId.get(s.id) ?? 0,
    }));
  }

  async findAll() {
    const staff = await this.prisma.productionStaff.findMany({
      orderBy: { name: 'asc' },
    });
    return this.withActiveOrders(staff);
  }

  async findOne(id: string) {
    const staff = await this.prisma.productionStaff.findUnique({
      where: { id },
    });
    if (!staff)
      throw new NotFoundException('Production staff member not found');
    const [withCount] = await this.withActiveOrders([staff]);
    return withCount;
  }

  create(dto: UpsertProductionStaffDto) {
    return this.prisma.productionStaff.create({ data: dto });
  }

  async update(id: string, dto: UpsertProductionStaffDto) {
    await this.ensureExists(id);
    return this.prisma.productionStaff.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Unassign rather than block deletion — a departed staff member
    // shouldn't be un-deletable just because history references them.
    await this.prisma.$transaction([
      this.prisma.order.updateMany({
        where: { assignedStaffId: id },
        data: { assignedStaffId: null },
      }),
      this.prisma.productionStaff.delete({ where: { id } }),
    ]);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.productionStaff.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists)
      throw new NotFoundException('Production staff member not found');
  }
}
