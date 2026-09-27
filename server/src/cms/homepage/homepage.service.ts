import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertHomepageSectionDto } from './dto/upsert-homepage-section.dto';

@Injectable()
export class HomepageService {
  constructor(private readonly prisma: PrismaService) {}

  findVisible() {
    return this.prisma.homepageSection.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.homepageSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const section = await this.prisma.homepageSection.findUnique({
      where: { id },
    });
    if (!section) throw new NotFoundException('Homepage section not found');
    return section;
  }

  create(dto: UpsertHomepageSectionDto) {
    return this.prisma.homepageSection.create({
      data: { ...dto, content: dto.content as Prisma.InputJsonValue },
    });
  }

  async update(id: string, dto: UpsertHomepageSectionDto) {
    await this.findOne(id);
    return this.prisma.homepageSection.update({
      where: { id },
      data: { ...dto, content: dto.content as Prisma.InputJsonValue },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.homepageSection.delete({ where: { id } });
  }

  async reorder(orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.homepageSection.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.findAllAdmin();
  }
}
