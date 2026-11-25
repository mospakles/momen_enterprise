import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertCategoryDto } from './dto/upsert-category.dto';

const CATEGORY_INCLUDE = {
  measurementFieldDefs: {
    select: { key: true },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.CategoryInclude;

type CategoryWithFields = Prisma.CategoryGetPayload<{
  include: typeof CATEGORY_INCLUDE;
}>;

/** Flattens the measurement-field relation into `measurementFieldKeys`
 * (ordered by the field def's sortOrder) so the storefront can tell which
 * measurements a style needs without a second request. */
function serializeCategory({
  measurementFieldDefs,
  ...category
}: CategoryWithFields) {
  return {
    ...category,
    measurementFieldKeys: measurementFieldDefs.map((f) => f.key),
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished() {
    const categories = await this.prisma.category.findMany({
      where: { publishStatus: PublishStatus.published },
      include: CATEGORY_INCLUDE,
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(serializeCategory);
  }

  async findAllAdmin() {
    const categories = await this.prisma.category.findMany({
      include: CATEGORY_INCLUDE,
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(serializeCategory);
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: CATEGORY_INCLUDE,
    });
    if (!category) throw new NotFoundException('Category not found');
    return serializeCategory(category);
  }

  async create(dto: UpsertCategoryDto) {
    const { measurementFieldKeys, ...data } = dto;
    const keys = await this.resolveFieldKeys(measurementFieldKeys);
    const category = await this.prisma.category
      .create({
        data: {
          ...data,
          seo: data.seo as Prisma.InputJsonValue,
          ...(keys?.length
            ? { measurementFieldDefs: { connect: keys.map((key) => ({ key })) } }
            : {}),
        },
        include: CATEGORY_INCLUDE,
      })
      .catch(this.handleUniqueSlug);
    return serializeCategory(category);
  }

  async update(id: string, dto: UpsertCategoryDto) {
    await this.findOne(id);
    const { measurementFieldKeys, ...data } = dto;
    const keys = await this.resolveFieldKeys(measurementFieldKeys);
    const category = await this.prisma.category
      .update({
        where: { id },
        data: {
          ...data,
          seo: data.seo as Prisma.InputJsonValue,
          ...(keys !== undefined
            ? { measurementFieldDefs: { set: keys.map((key) => ({ key })) } }
            : {}),
        },
        include: CATEGORY_INCLUDE,
      })
      .catch(this.handleUniqueSlug);
    return serializeCategory(category);
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

  /** De-duplicates the requested keys and rejects unknown ones with a clear
   * 400 rather than Prisma's opaque "record to connect not found". */
  private async resolveFieldKeys(keys: string[] | undefined) {
    if (keys === undefined) return undefined;
    const unique = [...new Set(keys)];
    if (unique.length === 0) return unique;
    const found = await this.prisma.measurementFieldDef.findMany({
      where: { key: { in: unique } },
      select: { key: true },
    });
    const known = new Set(found.map((f) => f.key));
    const missing = unique.filter((k) => !known.has(k));
    if (missing.length)
      throw new BadRequestException(
        `Unknown measurement field key(s): ${missing.join(', ')}`,
      );
    return unique;
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
