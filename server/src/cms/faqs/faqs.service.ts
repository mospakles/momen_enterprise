import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertFaqDto } from './dto/upsert-faq.dto';

@Injectable()
export class FaqsService {
  constructor(private readonly prisma: PrismaService) {}

  findPublished() {
    return this.prisma.fAQItem.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.fAQItem.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const faq = await this.prisma.fAQItem.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ item not found');
    return faq;
  }

  create(dto: UpsertFaqDto) {
    return this.prisma.fAQItem.create({ data: dto });
  }

  async update(id: string, dto: UpsertFaqDto) {
    await this.findOne(id);
    return this.prisma.fAQItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.fAQItem.delete({ where: { id } });
  }
}
