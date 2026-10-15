import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryMethod, ProductionSpeed } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertDeliveryZoneDto } from './dto/upsert-delivery-zone.dto';

export interface DeliveryQuote {
  zoneId: string;
  zoneName: string;
  deliveryFee: number;
  expressFee: number;
  standardDays: [number, number];
  expressDays: [number, number];
  method: DeliveryMethod;
}

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } });
  }

  findActive() {
    return this.prisma.deliveryZone.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Delivery zone not found');
    return zone;
  }

  create(dto: UpsertDeliveryZoneDto) {
    return this.prisma.deliveryZone.create({ data: dto });
  }

  async update(id: string, dto: UpsertDeliveryZoneDto) {
    await this.findOne(id);
    return this.prisma.deliveryZone.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.deliveryZone.delete({ where: { id } });
  }

  /** The checkout-time computation OrdersService calls — replaces trusting
   * deliveryFee/expressFee as client input. Matching is case-insensitive
   * since country names arrive from a free-text address field, not a
   * canonical enum. */
  async quote(
    country: string,
    speed: ProductionSpeed,
    subtotal: number,
    method: DeliveryMethod = DeliveryMethod.delivery,
  ): Promise<DeliveryQuote> {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { active: true },
    });
    const normalized = country.trim().toLowerCase();
    const zone = zones.find((z) =>
      z.countries.some((c) => c.trim().toLowerCase() === normalized),
    );
    if (!zone)
      throw new BadRequestException(
        `Delivery is not available to "${country}"`,
      );

    if (speed === ProductionSpeed.express && !zone.expressAvailable) {
      throw new BadRequestException(
        `Express delivery is not available for "${country}"`,
      );
    }

    const freeThreshold = zone.freeDeliveryThreshold
      ? Number(zone.freeDeliveryThreshold)
      : null;
    // A free-shipping threshold waives the standard fee, not the express
    // upcharge — express is a premium the customer is opting into
    // regardless of order size, not a shipping cost being covered.
    if (method === DeliveryMethod.pickup && !zone.pickupAvailable) {
      throw new BadRequestException(
        `Pickup is not available for "${country}"`,
      );
    }
    // Pickup replaces the courier fee with the zone's pickup fee (often 0).
    const deliveryFee =
      method === DeliveryMethod.pickup
        ? Number(zone.pickupFee)
        : freeThreshold !== null && subtotal >= freeThreshold
          ? 0
          : Number(zone.standardFee);
    const expressFee =
      speed === ProductionSpeed.express ? Number(zone.expressFee) : 0;

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      deliveryFee,
      expressFee,
      standardDays: [zone.standardDaysMin, zone.standardDaysMax],
      expressDays: [zone.expressDaysMin, zone.expressDaysMax],
      method,
    };
  }
}
