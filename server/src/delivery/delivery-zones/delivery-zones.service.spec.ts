import { BadRequestException } from '@nestjs/common';
import { ProductionSpeed } from '@prisma/client';
import { DeliveryZonesService } from './delivery-zones.service';

function makeService(zones: Record<string, unknown>[]) {
  const prisma = {
    deliveryZone: { findMany: jest.fn().mockResolvedValue(zones) },
  };
  return new DeliveryZonesService(prisma as never);
}

const NIGERIA_ZONE = {
  id: 'zone-ng',
  name: 'Nigeria',
  countries: ['Nigeria'],
  standardFee: 2000,
  expressFee: 5000,
  freeDeliveryThreshold: 50000,
  standardDaysMin: 3,
  standardDaysMax: 5,
  expressDaysMin: 1,
  expressDaysMax: 2,
  expressAvailable: true,
  active: true,
};

describe('DeliveryZonesService.quote', () => {
  it("matches a country case-insensitively against a zone's country list", async () => {
    const service = makeService([NIGERIA_ZONE]);
    const quote = await service.quote(
      'nigeria',
      ProductionSpeed.standard,
      10000,
    );
    expect(quote.zoneId).toBe('zone-ng');
  });

  it('throws when no active zone covers the destination country', async () => {
    const service = makeService([NIGERIA_ZONE]);
    await expect(
      service.quote('France', ProductionSpeed.standard, 10000),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when express is requested for a zone that does not offer it', async () => {
    const service = makeService([{ ...NIGERIA_ZONE, expressAvailable: false }]);
    await expect(
      service.quote('Nigeria', ProductionSpeed.express, 10000),
    ).rejects.toThrow(BadRequestException);
  });

  it('charges the standard fee below the free-delivery threshold', async () => {
    const service = makeService([NIGERIA_ZONE]);
    const quote = await service.quote(
      'Nigeria',
      ProductionSpeed.standard,
      10000,
    );
    expect(quote.deliveryFee).toBe(2000);
    expect(quote.expressFee).toBe(0);
  });

  it('waives the standard fee at or above the free-delivery threshold', async () => {
    const service = makeService([NIGERIA_ZONE]);
    const quote = await service.quote(
      'Nigeria',
      ProductionSpeed.standard,
      50000,
    );
    expect(quote.deliveryFee).toBe(0);
  });

  it('still charges the express fee even above the free-delivery threshold — free shipping only waives standard', async () => {
    const service = makeService([NIGERIA_ZONE]);
    const quote = await service.quote(
      'Nigeria',
      ProductionSpeed.express,
      100000,
    );
    expect(quote.deliveryFee).toBe(0);
    expect(quote.expressFee).toBe(5000);
  });
});
