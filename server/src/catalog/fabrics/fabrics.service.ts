import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertFabricDto } from './dto/upsert-fabric.dto';

@Injectable()
export class FabricsService {
  constructor(private readonly prisma: PrismaService) {}

  findAvailable() {
    return this.prisma.fabric.findMany({
      where: { available: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.fabric.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const fabric = await this.prisma.fabric.findUnique({ where: { id } });
    if (!fabric) throw new NotFoundException('Fabric not found');
    return fabric;
  }

  create(dto: UpsertFabricDto) {
    return this.prisma.fabric.create({ data: dto });
  }

  async update(id: string, dto: UpsertFabricDto) {
    await this.findOne(id);
    return this.prisma.fabric.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.fabric.delete({ where: { id } });
  }
}
