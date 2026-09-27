import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertColorSwatchDto } from './dto/upsert-color-swatch.dto';

@Injectable()
export class ColorSwatchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.colorSwatch.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const swatch = await this.prisma.colorSwatch.findUnique({ where: { id } });
    if (!swatch) throw new NotFoundException('Colour not found');
    return swatch;
  }

  create(dto: UpsertColorSwatchDto) {
    return this.prisma.colorSwatch.create({ data: dto });
  }

  async update(id: string, dto: UpsertColorSwatchDto) {
    await this.findOne(id);
    return this.prisma.colorSwatch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.colorSwatch.delete({ where: { id } });
  }
}
