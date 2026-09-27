import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertCategoryDto } from './dto/upsert-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findPublished() {
    return this.prisma.category.findMany({
      where: { publishStatus: PublishStatus.published },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: UpsertCategoryDto) {
    return this.prisma.category
      .create({ data: { ...dto, seo: dto.seo as Prisma.InputJsonValue } })
      .catch(this.handleUniqueSlug);
  }

  async update(id: string, dto: UpsertCategoryDto) {
    await this.findOne(id);
    return this.prisma.category
      .update({
        where: { id },
        data: { ...dto, seo: dto.seo as Prisma.InputJsonValue },
      })
      .catch(this.handleUniqueSlug);
  }

  async remove(id: string) {
    await this.findOne(id);
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0)
      throw new ConflictException('Category still has products assigned');
    await this.prisma.category.delete({ where: { id } });
  }

  private handleUniqueSlug(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A category with that slug already exists');
    }
    throw error;
  }
}
