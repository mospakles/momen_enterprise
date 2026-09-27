import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertCustomizationGroupDto } from './dto/upsert-customization-group.dto';

@Injectable()
export class CustomizationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customizationGroup.findMany({
      include: { choices: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.customizationGroup.findUnique({
      where: { id },
      include: { choices: true },
    });
    if (!group) throw new NotFoundException('Customization group not found');
    return group;
  }

  create(dto: UpsertCustomizationGroupDto) {
    return this.prisma.customizationGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        choices: { create: dto.choices },
      },
      include: { choices: true },
    });
  }

  async update(id: string, dto: UpsertCustomizationGroupDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.customizationChoice.deleteMany({ where: { groupId: id } });
      return tx.customizationGroup.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          choices: { create: dto.choices },
        },
        include: { choices: true },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.customizationGroup.delete({ where: { id } });
  }
}
