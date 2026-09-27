import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertCollectionDto } from './dto/upsert-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize<T extends { products: { product: { slug: string } }[] }>(
    collection: T,
  ) {
    const { products, ...rest } = collection;
    return { ...rest, productSlugs: products.map((p) => p.product.slug) };
  }

  async findPublished() {
    const rows = await this.prisma.collection.findMany({
      where: { publishStatus: PublishStatus.published },
      include: {
        products: { include: { product: { select: { slug: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async findAllAdmin() {
    const rows = await this.prisma.collection.findMany({
      include: {
        products: { include: { product: { select: { slug: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        products: { include: { product: { select: { slug: true } } } },
      },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return this.serialize(collection);
  }

  private handleUniqueSlug(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A collection with that slug already exists');
    }
    throw error;
  }

  async create(dto: UpsertCollectionDto) {
    const created = await this.prisma.collection
      .create({ data: { ...dto, seo: dto.seo as Prisma.InputJsonValue } })
      .catch(this.handleUniqueSlug);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpsertCollectionDto) {
    await this.findOne(id);
    await this.prisma.collection
      .update({
        where: { id },
        data: { ...dto, seo: dto.seo as Prisma.InputJsonValue },
      })
      .catch(this.handleUniqueSlug);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.collection.delete({ where: { id } });
  }
}
