import { PrismaClient, PublishStatus } from '@prisma/client';

// Moves every product that didn't come from the campaign import (SKUs start
// with MOM-CAM-) to draft, then does the same for categories and collections
// left with no published product. Nothing is deleted: anything can be
// published again from the admin.
//
//   node dist/prisma/scripts/retire-old-catalogue.js           (dry run: lists what would change)
//   node dist/prisma/scripts/retire-old-catalogue.js --apply   (makes the change)

const CAMPAIGN_SKU = 'MOM-CAM-';
const live = { not: PublishStatus.draft };

async function main(apply: boolean) {
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({
      where: { publishStatus: live, NOT: { sku: { startsWith: CAMPAIGN_SKU } } },
      select: { id: true, name: true, sku: true },
      orderBy: { name: 'asc' },
    });
    const stillLive = { publishStatus: PublishStatus.published, sku: { startsWith: CAMPAIGN_SKU } };
    const categories = await prisma.category.findMany({
      where: { publishStatus: live, products: { none: stillLive }, children: { none: { products: { some: stillLive } } } },
      select: { id: true, name: true },
    });
    const collections = await prisma.collection.findMany({
      where: { publishStatus: live, products: { none: { product: stillLive } } },
      select: { id: true, name: true },
    });

    console.log(`Products to move to draft (${products.length}):`);
    for (const product of products) console.log(`  ${product.name}  [${product.sku}]`);
    console.log(`Categories with no campaign product (${categories.length}): ${categories.map((c) => c.name).join(', ') || 'none'}`);
    console.log(`Collections with no campaign product (${collections.length}): ${collections.map((c) => c.name).join(', ') || 'none'}`);

    if (!apply) {
      console.log('\nDry run, nothing changed. Run again with --apply to move these to draft.');
      return;
    }
    const [p, c, k] = await prisma.$transaction([
      prisma.product.updateMany({ where: { id: { in: products.map((x) => x.id) } }, data: { publishStatus: PublishStatus.draft } }),
      prisma.category.updateMany({ where: { id: { in: categories.map((x) => x.id) } }, data: { publishStatus: PublishStatus.draft } }),
      prisma.collection.updateMany({ where: { id: { in: collections.map((x) => x.id) } }, data: { publishStatus: PublishStatus.draft } }),
    ]);
    console.log(`\nMoved to draft: ${p.count} products, ${c.count} categories, ${k.count} collections.`);
  } finally {
    await prisma.$disconnect();
  }
}

main(process.argv.includes('--apply')).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Retiring the old catalogue failed.');
  process.exitCode = 1;
});
