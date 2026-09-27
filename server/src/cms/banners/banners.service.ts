import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertBannerDto } from './dto/upsert-banner.dto';

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  findActive(placement?: string) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        active: true,
        ...(placement ? { placement: placement as never } : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  private normalize(dto: UpsertBannerDto) {
    return {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    };
  }

  create(dto: UpsertBannerDto) {
    return this.prisma.banner.create({ data: this.normalize(dto) });
  }

  async update(id: string, dto: UpsertBannerDto) {
    await this.findOne(id);
    return this.prisma.banner.update({
      where: { id },
      data: this.normalize(dto),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.banner.delete({ where: { id } });
  }
}
