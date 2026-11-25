import { Gender, PrismaClient, ProductionType, ProductType, PublishStatus, SizingMode } from '@prisma/client';
import { bespoke, bespokeSlug, campaignPhoto, campaignPrice, campaignSizes, offeredColours, readyToWear, type CampaignStyle } from '../campaign-range';

const entries = [
  ...readyToWear.map((style) => ({ style, slug: style.slug, madeToMeasure: false })),
  ...bespoke.map((style) => ({ style, slug: bespokeSlug(style), madeToMeasure: true })),
];

async function importDrafts() {
  const prisma = new PrismaClient();
  try {
    const counts = await prisma.$transaction(async (tx) => {
      const collections = await Promise.all([
        tx.collection.upsert({
          where: { slug: 'ready-to-wear' },
          update: {},
          create: {
            slug: 'ready-to-wear', name: 'Ready-to-Wear',
            description: 'The momen. campaign collection in standard sizes.',
            image: campaignPhoto('cobalt-trousers-duo-front'), publishStatus: PublishStatus.published,
          },
        }),
        tx.collection.upsert({
          where: { slug: 'bespoke' },
          update: {},
          create: {
            slug: 'bespoke', name: 'Bespoke',
            description: 'Campaign pieces made to your measurements.',
            image: campaignPhoto('blue-geometric-set-full-length'), publishStatus: PublishStatus.published,
          },
        }),
      ]);

      const sizeLabels = [...new Set(entries.flatMap(({ style, madeToMeasure }) => campaignSizes(style, madeToMeasure)))];
      const sizeOptions = new Map(await Promise.all(sizeLabels.map(async (label, sortOrder) => {
        const option = await tx.sizeOption.upsert({
          where: { label }, update: {}, create: { label, sortOrder },
          select: { id: true },
        });
        return [label, option.id] as const;
      })));

      let created = 0;
      let priced = 0;
      let sized = 0;
      for (const { style, slug, madeToMeasure } of entries) {
        const sku = `MOM-CAM-${slug.toUpperCase()}`;
        const price = campaignPrice(style, madeToMeasure);
        const sizes = campaignSizes(style, madeToMeasure).map((label, sortOrder) => ({
          label, sortOrder, sizeOptionId: sizeOptions.get(label),
        }));
        const existing = await tx.product.findUnique({
          where: { slug },
          select: { id: true, sku: true, publishStatus: true, sizes: { select: { label: true } } },
        });
        if (existing) {
          if (existing.sku !== sku || existing.publishStatus !== PublishStatus.draft) continue;
          if (price !== undefined) {
            priced += (await tx.product.updateMany({
              where: { slug, sku, publishStatus: PublishStatus.draft, price: 0 },
              data: { price },
            })).count;
          }
          const existingSizes = new Set(existing.sizes.map(({ label }) => label));
          const missingSizes = sizes.filter(({ label }) => !existingSizes.has(label));
          if (missingSizes.length) {
            const result = await tx.productSize.createMany({
              data: missingSizes.map((size) => ({ ...size, productId: existing.id })),
            });
            sized += result.count;
          }
          continue;
        }
        const category = await tx.category.upsert({
          where: { slug: categorySlug(style) },
          update: {},
          create: {
            slug: categorySlug(style), name: style.name,
            image: campaignPhoto(style.colours[0].photos[0]),
            publishStatus: PublishStatus.published,
          },
        });
        const images = style.colours[0].photos.map(campaignPhoto);
        await tx.product.create({
          data: {
            slug,
            sku,
            name: madeToMeasure ? `${style.name} (Bespoke)` : style.name,
            description: style.description,
            shortDescription: style.description,
            gender: Gender.men,
            garment: style.garment,
            category: { connect: { id: category.id } },
            collections: { create: { collectionId: collections[madeToMeasure ? 1 : 0].id } },
            images,
            sizes: { create: sizes },
            colorVariants: { create: offeredColours(style, madeToMeasure).map((colour, sortOrder) => ({
              name: colour.name, hex: colour.hex, sortOrder, images: colour.photos.map(campaignPhoto),
            })) },
            productionType: madeToMeasure ? ProductionType.made_to_measure : ProductionType.ready_to_wear,
            productType: madeToMeasure ? ProductType.customizable : style.garment === 'accessory' ? ProductType.accessory : ProductType.ready_to_wear,
            sizingMode: madeToMeasure ? SizingMode.made_to_measure : SizingMode.standard,
            customizable: madeToMeasure,
            specialInstructionsAllowed: madeToMeasure,
            price: price ?? 0,
            stockQuantity: 0,
            productionDaysStandardMin: 0,
            productionDaysStandardMax: 0,
            productionDaysExpressMin: 0,
            productionDaysExpressMax: 0,
            publishStatus: PublishStatus.draft,
          },
        });
        created++;
      }
      return { created, priced, sized };
    }, { timeout: 15_000, isolationLevel: 'Serializable' });
    console.log(`Campaign drafts created: ${counts.created}. Draft prices added: ${counts.priced}. Draft size options added: ${counts.sized}.`);
  } finally {
    await prisma.$disconnect();
  }
}

function categorySlug(style: CampaignStyle) {
  return style.slug === 'kaftan' || style.slug === 'kaftan-senator' ? 'kaftans' : style.slug;
}

if (process.argv.includes('--apply')) {
  void importDrafts().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Campaign import failed.');
    process.exitCode = 1;
  });
} else {
  for (const { style, slug, madeToMeasure } of entries) {
    const sizes = campaignSizes(style, madeToMeasure);
    console.log(`${madeToMeasure ? 'Bespoke' : 'Ready-to-Wear'}  ${slug}${sizes.length ? ` (${sizes.join(', ')})` : ''}`);
  }
  console.log('Dry run. Use --apply to import the campaign as drafts.');
}
