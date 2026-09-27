import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertSizeOptionDto } from './dto/upsert-size-option.dto';

@Injectable()
export class SizeOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.sizeOption.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.sizeOption.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const option = await this.prisma.sizeOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Size option not found');
    return option;
  }

  create(dto: UpsertSizeOptionDto) {
    return this.prisma.sizeOption.create({ data: dto });
  }

  async update(id: string, dto: UpsertSizeOptionDto) {
    await this.findOne(id);
    return this.prisma.sizeOption.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.sizeOption.delete({ where: { id } });
  }
}
