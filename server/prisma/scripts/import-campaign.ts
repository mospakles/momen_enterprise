import { Gender, PrismaClient, ProductionType, ProductType, PublishStatus, SizingMode } from '@prisma/client';
import { bespoke, bespokeSlug, campaignPhoto, campaignPrice, campaignSizes, offeredColours, readyToWear, type CampaignStyle } from '../campaign-range';

const entries = [
  ...readyToWear.map((style) => ({ style, slug: style.slug, madeToMeasure: false })),
  ...bespoke.map((style) => ({ style, slug: bespokeSlug(style), madeToMeasure: true })),
];

// --publish puts the campaign live. It needs --stock=N: every Ready-to-Wear
// size gets N units, counted per size so one size can't sell another's stock.
// Set the real count for each size afterwards in Admin → Products. Bespoke
// pieces are made to order and have no stock.
const publish = process.argv.includes('--publish');
const stockArg = process.argv.find((arg) => arg.startsWith('--stock='));
const stock = stockArg ? Number(stockArg.slice('--stock='.length)) : 0;
/** Product total and per-size counts for a Ready-to-Wear piece being published. */
const stockFor = (sizeCount: number) => ({ total: stock * Math.max(1, sizeCount), perSize: sizeCount > 1 ? stock : null });

async function importDrafts() {
  const prisma = new PrismaClient();
  try {
    const counts = await prisma.$transaction(async (tx) => {
      const collections = await Promise.all([
        tx.collection.upsert({
          where: { slug: 'ready-to-wear' },
          update: publish ? { publishStatus: PublishStatus.published } : {},
          create: {
            slug: 'ready-to-wear', name: 'Ready-to-Wear',
            description: 'The momen. campaign collection in standard sizes.',
            image: campaignPhoto('cobalt-trousers-duo-front'), publishStatus: PublishStatus.published,
          },
        }),
        tx.collection.upsert({
          where: { slug: 'bespoke' },
          update: publish ? { publishStatus: PublishStatus.published } : {},
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
      let synced = 0;
      let published = 0;
      for (const { style, slug, madeToMeasure } of entries) {
        const sku = `MOM-CAM-${slug.toUpperCase()}`;
        const price = campaignPrice(style, madeToMeasure);
        const stocked = publish && !madeToMeasure;
        const labels = campaignSizes(style, madeToMeasure);
        const sizes = labels.map((label, sortOrder) => ({
          label, sortOrder, sizeOptionId: sizeOptions.get(label),
          ...(stocked ? { stockQuantity: stockFor(labels.length).perSize } : {}),
        }));
        const existing = await tx.product.findUnique({
          where: { slug },
          select: { id: true, sku: true, publishStatus: true, sizes: { select: { label: true } } },
        });
        const category = await tx.category.upsert({
          where: { slug: categorySlug(style) },
          update: publish ? { publishStatus: PublishStatus.published } : {},
          create: {
            slug: categorySlug(style), name: style.name,
            image: campaignPhoto(style.colours[0].photos[0]),
            publishStatus: PublishStatus.published,
          },
        });
        const colourVariants = offeredColours(style, madeToMeasure).map((colour, sortOrder) => ({
          name: colour.name, hex: colour.hex, sortOrder, images: colour.photos.map(campaignPhoto),
        }));
        const images = offeredColours(style, madeToMeasure)[0].photos.map(campaignPhoto);
        if (existing) {
          if (existing.sku !== sku) continue;
          // Pictures always follow the catalogue in campaign-range.ts.
          await tx.product.update({ where: { id: existing.id }, data: { images } });
          await tx.productColorVariant.deleteMany({ where: { productId: existing.id } });
          await tx.productColorVariant.createMany({ data: colourVariants.map((variant) => ({ ...variant, productId: existing.id })) });
          synced++;
          if (price !== undefined) {
            priced += (await tx.product.updateMany({ where: { id: existing.id, price: 0 }, data: { price } })).count;
          }
          const existingSizes = new Set(existing.sizes.map(({ label }) => label));
          const missingSizes = sizes.filter(({ label }) => !existingSizes.has(label));
          if (missingSizes.length) {
            const result = await tx.productSize.createMany({
              data: missingSizes.map((size) => ({ ...size, productId: existing.id })),
            });
            sized += result.count;
          }
          if (publish) {
            const going = await tx.product.updateMany({
              where: { id: existing.id, publishStatus: { not: PublishStatus.published } },
              data: { publishStatus: PublishStatus.published, ...(stocked ? { stockQuantity: stockFor(labels.length).total } : {}) },
            });
            if (going.count && stocked && labels.length > 1) {
              await tx.productSize.updateMany({ where: { productId: existing.id }, data: { stockQuantity: stock } });
            }
            published += going.count;
          }
          continue;
        }
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
            colorVariants: { create: colourVariants },
            productionType: madeToMeasure ? ProductionType.made_to_measure : ProductionType.ready_to_wear,
            productType: madeToMeasure ? ProductType.customizable : style.garment === 'accessory' ? ProductType.accessory : ProductType.ready_to_wear,
            sizingMode: madeToMeasure ? SizingMode.made_to_measure : SizingMode.standard,
            customizable: madeToMeasure,
            specialInstructionsAllowed: madeToMeasure,
            price: price ?? 0,
            stockQuantity: stocked ? stockFor(labels.length).total : 0,
            productionDaysStandardMin: 0,
            productionDaysStandardMax: 0,
            productionDaysExpressMin: 0,
            productionDaysExpressMax: 0,
            publishStatus: publish ? PublishStatus.published : PublishStatus.draft,
          },
        });
        created++;
        if (publish) published++;
      }
      return { created, priced, sized, synced, published };
    }, { timeout: 60_000, isolationLevel: 'Serializable' });
    console.log(`Created: ${counts.created}. Pictures synced: ${counts.synced}. Prices added: ${counts.priced}. Sizes added: ${counts.sized}. Published: ${counts.published}.`);
  } finally {
    await prisma.$disconnect();
  }
}

function categorySlug(style: CampaignStyle) {
  return style.slug === 'kaftan' || style.slug === 'kaftan-senator' ? 'kaftans' : style.slug;
}

if (!Number.isInteger(stock) || stock < 0 || (publish && !stockArg)) {
  console.error('With --publish, say how many of each Ready-to-Wear size you hold, e.g. --stock=3 (per size).');
  process.exitCode = 1;
} else if (process.argv.includes('--apply')) {
  void importDrafts().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Campaign import failed.');
    process.exitCode = 1;
  });
} else {
  for (const { style, slug, madeToMeasure } of entries) {
    const sizes = campaignSizes(style, madeToMeasure);
    console.log(`${madeToMeasure ? 'Bespoke' : 'Ready-to-Wear'}  ${slug}${sizes.length ? ` (${sizes.join(', ')})` : ''}`);
  }
  console.log(`Dry run. Use --apply to import${publish ? ` and publish (${stock} of each Ready-to-Wear size)` : ' as drafts'}.`);
}
