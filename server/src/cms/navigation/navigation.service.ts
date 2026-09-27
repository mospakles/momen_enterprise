import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertNavigationItemDto } from './dto/upsert-navigation-item.dto';

@Injectable()
export class NavigationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Top-level items with their children nested — the shape the frontend's
   * mega-menu expects, rather than a flat list it would have to tree-ify itself. */
  findTree() {
    return this.prisma.navigationItem.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  findAllAdmin() {
    return this.prisma.navigationItem.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.navigationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Navigation item not found');
    return item;
  }

  create(dto: UpsertNavigationItemDto) {
    return this.prisma.navigationItem.create({ data: dto });
  }

  async update(id: string, dto: UpsertNavigationItemDto) {
    await this.findOne(id);
    if (dto.parentId === id)
      throw new BadRequestException(
        'A navigation item cannot be its own parent',
      );
    return this.prisma.navigationItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.navigationItem.delete({ where: { id } });
  }
}
