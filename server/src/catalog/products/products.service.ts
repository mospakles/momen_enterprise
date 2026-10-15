import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { isEffectivelyPublished } from '../../common/utils/publish-status.util';
import { deriveStockStatus } from './product-derived.util';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { QueryProductsDto } from './dto/query-products.dto';
import type { AdminQueryProductsDto } from './dto/admin-query-products.dto';
import type { BulkUpdateProductsDto } from './dto/bulk-update-products.dto';

/** Fields whose changes are worth a dedicated audit entry — price and stock
 * errors are expensive to debug after the fact, and publish-state changes
 * immediately affect what the storefront shows. */
const AUDITED_FIELDS = [
  'price',
  'compareAtPrice',
  'salePrice',
  'stockQuantity',
  'lowStockThreshold',
  'publishStatus',
] as const;

export interface ActorContext {
  id: string;
  name: string;
}

const PRODUCT_INCLUDE = {
  category: true,
  collections: { include: { collection: true } },
  tags: { include: { tag: true } },
  colorVariants: { orderBy: { sortOrder: 'asc' } },
  sizes: { orderBy: { sortOrder: 'asc' }, include: { sizeOption: true } },
  fabrics: { include: { fabric: true } },
  customizations: { include: { group: { include: { choices: true } } } },
  measurementFieldDefs: true,
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly events: EventEmitter2,
  ) {}

  /** Shapes a raw Prisma row into the flat frontend `Product` contract:
   * `collectionSlugs: string[]`, `tags: string[]`, `colors: ProductColor[]`,
   * `sizes: string[]`, `fabricIds: string[]`, a derived `stock` status, etc. */
  private serialize(product: ProductWithRelations) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      category: product.category.slug,
      collectionSlugs: product.collections.map((c) => c.collection.slug),
      tags: product.tags.map((t) => t.tag.name),
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice
        ? Number(product.compareAtPrice)
        : undefined,
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      currency: product.currency,
      images: product.images,
      hoverImage: product.hoverImage ?? undefined,
      videos: product.videos,
      colors: product.colorVariants.map((c) => ({
        name: c.name,
        hex: c.hex,
        ...(c.images.length ? { images: c.images } : {}),
      })),
      sizes: product.sizes.map((s) => s.label),
      // Available units per size, only for sizes tracked individually.
      sizeStock: Object.fromEntries(
        product.sizes
          .filter((s) => s.stockQuantity !== null)
          .map((s) => [
            s.label,
            Math.max(0, (s.stockQuantity ?? 0) - s.reservedQuantity),
          ]),
      ),
      // Raw per-size counts for the admin editor (tracked sizes only).
      sizeInventory: Object.fromEntries(
        product.sizes
          .filter((s) => s.stockQuantity !== null)
          .map((s) => [s.label, s.stockQuantity ?? 0]),
      ),
      spinImages: product.spinImages,
      productionType: product.productionType,
      productType: product.productType,
      gender: product.gender,
      sizingMode: product.sizingMode,
      garment: product.garment,
      fabric: product.fabrics[0]?.fabric.name ?? '',
      fabricIds: product.fabrics.map((f) => f.fabricId),
      description: product.description,
      shortDescription: product.shortDescription ?? undefined,
      details: product.details,
      careInstructions: product.careInstructions,
      productionDays: {
        standard: [
          product.productionDaysStandardMin,
          product.productionDaysStandardMax,
        ] as [number, number],
        express: [
          product.productionDaysExpressMin,
          product.productionDaysExpressMax,
        ] as [number, number],
      },
      isNew: product.isNew,
      isFeatured: product.isFeatured,
      isSignature: product.isSignature,
      stock: deriveStockStatus(product),
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      reservedQuantity: product.reservedQuantity,
      publishStatus: product.publishStatus,
      publishAt: product.publishAt?.toISOString(),
      expressEligible: product.expressEligible,
      customization: product.customizations.map((c) => ({
        groupId: c.groupId,
        enabled: c.enabled,
        required: c.required,
      })),
      measurementFieldKeys: product.measurementFieldDefs.map((m) => m.key),
      customizable: product.customizable,
      referenceImagesAllowed: product.referenceImagesAllowed,
      specialInstructionsAllowed: product.specialInstructionsAllowed,
      crossSellCategorySlugs: product.crossSellCategorySlugs,
      sizeChart: product.sizeChart ?? undefined,
      seo: (product.seo as Record<string, unknown> | null) ?? {},
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private publishedWhere(): Prisma.ProductWhereInput {
    return {
      OR: [
        { publishStatus: PublishStatus.published },
        {
          publishStatus: PublishStatus.scheduled,
          publishAt: { lte: new Date() },
        },
      ],
    };
  }

  private buildFilters(query: QueryProductsDto): Prisma.ProductWhereInput {
    return {
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.collection
        ? { collections: { some: { collection: { slug: query.collection } } } }
        : {}),
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.tag ? { tags: { some: { tag: { name: query.tag } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async findPublished(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    const where: Prisma.ProductWhereInput = {
      AND: [this.publishedWhere(), this.buildFilters(query)],
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => this.serialize(p)),
      total,
      page,
      pageSize,
    };
  }

  async findPublishedBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...this.publishedWhere() },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.serialize(product);
  }

  /** Published product by id, or null (used to re-hydrate saved bags). */
  async findOnePublishedById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...this.publishedWhere() },
      include: PRODUCT_INCLUDE,
    });
    return product ? this.serialize(product) : null;
  }

  async findAllAdmin(query: AdminQueryProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.ProductWhereInput = {
      ...this.buildFilters(query),
      ...(query.publishStatus ? { publishStatus: query.publishStatus } : {}),
      ...(query.sku
        ? { sku: { contains: query.sku, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => this.serialize(p)),
      total,
      page,
      pageSize,
    };
  }

  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.serialize(product);
  }

  /** Builds nested-relation writes for a brand-new product — only
   * `create`/`connect` are valid on a create-nested input, there's nothing
   * to delete or set-replace yet. */
  private buildCreateRelations(dto: CreateProductDto) {
    return {
      collections: {
        create: dto.collectionIds.map((collectionId) => ({ collectionId })),
      },
      sizes: {
        create: dto.sizes.map((s) => ({
          sizeOptionId: s.sizeOptionId,
          label: s.label,
          sortOrder: s.sortOrder,
          stockQuantity: s.stockQuantity ?? null,
        })),
      },
      colorVariants: {
        create: dto.colorVariants.map((c) => ({
          name: c.name,
          hex: c.hex,
          sortOrder: c.sortOrder,
          images: c.images ?? [],
        })),
      },
      fabrics: { create: dto.fabricIds.map((fabricId) => ({ fabricId })) },
      customizations: {
        create: (dto.customizations ?? []).map((c) => ({
          groupId: c.groupId,
          enabled: c.enabled,
          required: c.required,
        })),
      },
      measurementFieldDefs: {
        connect: (dto.measurementFieldKeys ?? []).map((key) => ({ key })),
      },
    };
  }

  /** Builds nested-relation writes for an existing product — each nested
   * list is fully replaced (delete then recreate) when the DTO includes it,
   * left untouched (`undefined`) when it doesn't. `measurementFieldDefs` is
   * a pure many-to-many, so `set` (not delete+create) replaces its members. */
  private buildUpdateRelations(dto: UpdateProductDto) {
    return {
      collections:
        dto.collectionIds !== undefined
          ? {
              deleteMany: {},
              create: dto.collectionIds.map((collectionId) => ({
                collectionId,
              })),
            }
          : undefined,
      sizes:
        dto.sizes !== undefined
          ? {
              deleteMany: {},
              create: dto.sizes.map((s) => ({
                sizeOptionId: s.sizeOptionId,
                label: s.label,
                sortOrder: s.sortOrder,
                stockQuantity: s.stockQuantity ?? null,
              })),
            }
          : undefined,
      colorVariants:
        dto.colorVariants !== undefined
          ? {
              deleteMany: {},
              create: dto.colorVariants.map((c) => ({
                name: c.name,
                hex: c.hex,
                sortOrder: c.sortOrder,
                images: c.images ?? [],
              })),
            }
          : undefined,
      fabrics:
        dto.fabricIds !== undefined
          ? {
              deleteMany: {},
              create: dto.fabricIds.map((fabricId) => ({ fabricId })),
            }
          : undefined,
      customizations:
        dto.customizations !== undefined
          ? {
              deleteMany: {},
              create: dto.customizations.map((c) => ({
                groupId: c.groupId,
                enabled: c.enabled,
                required: c.required,
              })),
            }
          : undefined,
      measurementFieldDefs:
        dto.measurementFieldKeys !== undefined
          ? { set: dto.measurementFieldKeys.map((key) => ({ key })) }
          : undefined,
    };
  }

  private async syncTags(
    productId: string,
    tagNames: string[] | undefined,
    tx: Prisma.TransactionClient,
  ) {
    if (tagNames === undefined) return;
    await tx.productTag.deleteMany({ where: { productId } });
    for (const name of tagNames) {
      const tag = await tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await tx.productTag.create({ data: { productId, tagId: tag.id } });
    }
  }

  async create(dto: CreateProductDto) {
    const relations = this.buildCreateRelations(dto);
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          sku: dto.sku,
          categoryId: dto.categoryId,
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          salePrice: dto.salePrice,
          images: dto.images,
          hoverImage: dto.hoverImage,
          videos: dto.videos ?? [],
          spinImages: dto.spinImages ?? [],
          productionType: dto.productionType,
          productType: dto.productType,
          gender: dto.gender,
          sizingMode: dto.sizingMode,
          garment: dto.garment,
          description: dto.description,
          shortDescription: dto.shortDescription,
          details: dto.details,
          careInstructions: dto.careInstructions,
          productionDaysStandardMin: dto.productionDaysStandardMin,
          productionDaysStandardMax: dto.productionDaysStandardMax,
          productionDaysExpressMin: dto.productionDaysExpressMin,
          productionDaysExpressMax: dto.productionDaysExpressMax,
          isNew: dto.isNew ?? false,
          isFeatured: dto.isFeatured ?? false,
          isSignature: dto.isSignature ?? false,
          stockQuantity: trackedSizeTotal(dto.sizes) ?? dto.stockQuantity,
          lowStockThreshold: dto.lowStockThreshold,
          publishStatus: dto.publishStatus ?? PublishStatus.draft,
          publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
          expressEligible: dto.expressEligible ?? false,
          customizable: dto.customizable ?? false,
          referenceImagesAllowed: dto.referenceImagesAllowed ?? false,
          specialInstructionsAllowed: dto.specialInstructionsAllowed ?? false,
          crossSellCategorySlugs: dto.crossSellCategorySlugs ?? [],
          sizeChart: dto.sizeChart,
          seo: dto.seo as Prisma.InputJsonValue,
          collections: relations.collections,
          sizes: relations.sizes,
          colorVariants: relations.colorVariants,
          fabrics: relations.fabrics,
          customizations: relations.customizations,
          measurementFieldDefs: relations.measurementFieldDefs,
        },
      });
      await this.syncTags(created.id, dto.tagNames, tx);
      return created;
    });

    return this.findOneAdmin(product.id);
  }

  async update(id: string, dto: UpdateProductDto, actor?: ActorContext) {
    const before = await this.prisma.product.findUniqueOrThrow({
      where: { id },
    });
    const relations = this.buildUpdateRelations(dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.compareAtPrice !== undefined
            ? { compareAtPrice: dto.compareAtPrice }
            : {}),
          ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
          ...(dto.images !== undefined ? { images: dto.images } : {}),
          ...(dto.hoverImage !== undefined
            ? { hoverImage: dto.hoverImage }
            : {}),
          ...(dto.videos !== undefined ? { videos: dto.videos } : {}),
          ...(dto.spinImages !== undefined
            ? { spinImages: dto.spinImages }
            : {}),
          ...(dto.productionType !== undefined
            ? { productionType: dto.productionType }
            : {}),
          ...(dto.productType !== undefined
            ? { productType: dto.productType }
            : {}),
          ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
          ...(dto.sizingMode !== undefined
            ? { sizingMode: dto.sizingMode }
            : {}),
          ...(dto.garment !== undefined ? { garment: dto.garment } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.shortDescription !== undefined
            ? { shortDescription: dto.shortDescription }
            : {}),
          ...(dto.details !== undefined ? { details: dto.details } : {}),
          ...(dto.careInstructions !== undefined
            ? { careInstructions: dto.careInstructions }
            : {}),
          ...(dto.productionDaysStandardMin !== undefined
            ? { productionDaysStandardMin: dto.productionDaysStandardMin }
            : {}),
          ...(dto.productionDaysStandardMax !== undefined
            ? { productionDaysStandardMax: dto.productionDaysStandardMax }
            : {}),
          ...(dto.productionDaysExpressMin !== undefined
            ? { productionDaysExpressMin: dto.productionDaysExpressMin }
            : {}),
          ...(dto.productionDaysExpressMax !== undefined
            ? { productionDaysExpressMax: dto.productionDaysExpressMax }
            : {}),
          ...(dto.isNew !== undefined ? { isNew: dto.isNew } : {}),
          ...(dto.isFeatured !== undefined
            ? { isFeatured: dto.isFeatured }
            : {}),
          ...(dto.isSignature !== undefined
            ? { isSignature: dto.isSignature }
            : {}),
          // When sizes carry their own stock, the product total is their sum.
          ...(trackedSizeTotal(dto.sizes) !== undefined
            ? { stockQuantity: trackedSizeTotal(dto.sizes) }
            : dto.stockQuantity !== undefined
              ? { stockQuantity: dto.stockQuantity }
              : {}),
          ...(dto.lowStockThreshold !== undefined
            ? { lowStockThreshold: dto.lowStockThreshold }
            : {}),
          ...(dto.publishStatus !== undefined
            ? { publishStatus: dto.publishStatus }
            : {}),
          ...(dto.publishAt !== undefined
            ? { publishAt: dto.publishAt ? new Date(dto.publishAt) : null }
            : {}),
          ...(dto.expressEligible !== undefined
            ? { expressEligible: dto.expressEligible }
            : {}),
          ...(dto.customizable !== undefined
            ? { customizable: dto.customizable }
            : {}),
          ...(dto.referenceImagesAllowed !== undefined
            ? { referenceImagesAllowed: dto.referenceImagesAllowed }
            : {}),
          ...(dto.specialInstructionsAllowed !== undefined
            ? { specialInstructionsAllowed: dto.specialInstructionsAllowed }
            : {}),
          ...(dto.crossSellCategorySlugs !== undefined
            ? { crossSellCategorySlugs: dto.crossSellCategorySlugs }
            : {}),
          ...(dto.sizeChart !== undefined ? { sizeChart: dto.sizeChart } : {}),
          ...(dto.seo !== undefined
            ? { seo: dto.seo as Prisma.InputJsonValue }
            : {}),
          collections: relations.collections,
          sizes: relations.sizes,
          colorVariants: relations.colorVariants,
          fabrics: relations.fabrics,
          customizations: relations.customizations,
          measurementFieldDefs: relations.measurementFieldDefs,
        },
      });
      await this.syncTags(id, dto.tagNames, tx);
    });

    if (actor) await this.logAuditedFieldChanges(before, id, actor);
    this.events.emit('product.changed', { productId: id });
    return this.findOneAdmin(id);
  }

  private async logAuditedFieldChanges(
    before: Prisma.ProductGetPayload<Record<string, never>>,
    id: string,
    actor: ActorContext,
  ) {
    const after = await this.prisma.product.findUniqueOrThrow({
      where: { id },
    });
    // Decimal/enum fields need a JSON-safe form for the audit log's Json columns.
    const jsonSafe = (value: unknown) =>
      value === null || value === undefined ? value : String(value);

    const changed = AUDITED_FIELDS.filter(
      (field) => jsonSafe(before[field]) !== jsonSafe(after[field]),
    );
    if (changed.length === 0) return;

    await this.auditLog.log({
      actorId: actor.id,
      actorName: actor.name,
      action: 'product.update',
      resource: 'products',
      resourceId: id,
      summary: `Updated ${changed.join(', ')} on "${after.name}"`,
      before: Object.fromEntries(changed.map((f) => [f, jsonSafe(before[f])])),
      after: Object.fromEntries(changed.map((f) => [f, jsonSafe(after[f])])),
    });
  }

  async bulkUpdate(dto: BulkUpdateProductsDto) {
    const { ids, ...patch } = dto;
    // Scalar-only patch — bulk actions (publish/unpublish, feature, etc.)
    // don't touch nested relations like sizes/colours/customizations.
    const data: Prisma.ProductUpdateManyMutationInput = {
      ...(patch.publishStatus !== undefined
        ? { publishStatus: patch.publishStatus }
        : {}),
      ...(patch.isFeatured !== undefined
        ? { isFeatured: patch.isFeatured }
        : {}),
      ...(patch.isNew !== undefined ? { isNew: patch.isNew } : {}),
      ...(patch.isSignature !== undefined
        ? { isSignature: patch.isSignature }
        : {}),
      ...(patch.expressEligible !== undefined
        ? { expressEligible: patch.expressEligible }
        : {}),
      ...(patch.categoryId !== undefined
        ? { categoryId: patch.categoryId }
        : {}),
    };
    await this.prisma.product.updateMany({ where: { id: { in: ids } }, data });
    ids.forEach((productId) =>
      this.events.emit('product.changed', { productId }),
    );
    return this.prisma.product
      .findMany({ where: { id: { in: ids } }, include: PRODUCT_INCLUDE })
      .then((rows) => rows.map((p) => this.serialize(p)));
  }

  async remove(id: string, actor?: ActorContext) {
    const product = await this.findOneAdmin(id);
    await this.prisma.product.delete({ where: { id } });
    if (actor) {
      await this.auditLog.log({
        actorId: actor.id,
        actorName: actor.name,
        action: 'product.delete',
        resource: 'products',
        resourceId: id,
        summary: `Deleted product "${product.name}"`,
        before: { name: product.name, sku: product.sku },
      });
    }
  }

  /** Used by OrdersService to snapshot line-item pricing server-side rather
   * than trusting client-submitted prices. */
  async getPricingSnapshot(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        fabrics: { include: { fabric: true } },
        customizations: { include: { group: { include: { choices: true } } } },
        collections: { include: { collection: { select: { slug: true } } } },
        sizes: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      unitPrice: Number(product.salePrice ?? product.price),
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? null,
      sku: product.sku,
      publishStatus: product.publishStatus,
      isEffectivelyPublished: isEffectivelyPublished(product),
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      /** Available units for a size tracked individually, else undefined. */
      sizeAvailable: (label: string): number | undefined => {
        const row = product.sizes.find(
          (s) => s.label === label && s.stockQuantity !== null,
        );
        return row
          ? (row.stockQuantity ?? 0) - row.reservedQuantity
          : undefined;
      },
      sizingMode: product.sizingMode,
      customizable: product.customizable,
      garment: product.garment,
      collectionSlugs: product.collections.map((c) => c.collection.slug),
      productionDays: {
        standardDaysMin: product.productionDaysStandardMin,
        standardDaysMax: product.productionDaysStandardMax,
        expressDaysMin: product.productionDaysExpressMin,
        expressDaysMax: product.productionDaysExpressMax,
      },
      getChoiceCost: (groupId: string, choiceId: string): number => {
        const enabled = product.customizations.find(
          (c) => c.groupId === groupId && c.enabled,
        );
        if (!enabled) return 0;
        const choice = enabled.group.choices.find(
          (c) => c.id === choiceId && c.available,
        );
        return choice ? Number(choice.additionalCost) : 0;
      },
      getFabricCost: (fabricId: string): number => {
        const link = product.fabrics.find(
          (f) => f.fabricId === fabricId && f.fabric.available,
        );
        return link ? Number(link.fabric.additionalCost) : 0;
      },
    };
  }
}

/** Sum of per-size stock when any size in the payload is tracked; undefined
 * when sizes are absent or none carry a quantity. */
function trackedSizeTotal(
  sizes: { stockQuantity?: number | null }[] | undefined,
): number | undefined {
  if (!sizes) return undefined;
  const tracked = sizes.filter(
    (s) => s.stockQuantity !== undefined && s.stockQuantity !== null,
  );
  if (tracked.length === 0) return undefined;
  return tracked.reduce((sum, s) => sum + (s.stockQuantity ?? 0), 0);
}
