/**
 * Adds the momen. womenswear pieces photographed in public/brand: a "Women"
 * category (with trousers / shorts / sets underneath) and four products whose
 * colourways are the individual prints, each with its own photo.
 *
 * Safe to re-run (upserts by slug). `--revert` removes exactly these.
 *
 *   npx ts-node prisma/scripts/add-womenswear.ts
 *   npx ts-node prisma/scripts/add-womenswear.ts --revert
 *
 * PRICES ARE PROPOSALS — confirm them in Admin → Products before launch.
 */
import { Garment, PrismaClient, PublishStatus } from '@prisma/client';

const prisma = new PrismaClient();
const img = (name: string) => `/images/brand/${name}.jpg`;

const CATEGORIES = [
  { slug: 'women', name: 'Women', description: 'Ankara and aso-oke pieces for her, cut in Lagos.', image: img('womenankara1'), sortOrder: 20 },
  { slug: 'womens-trousers', name: "Women's Trousers", image: img('ladiesankarapant3'), sortOrder: 21, parent: 'women' },
  { slug: 'womens-shorts', name: "Women's Shorts", image: img('ladiesankarashort2'), sortOrder: 22, parent: 'women' },
  { slug: 'womens-sets', name: "Women's Sets", image: img('womenasooke'), sortOrder: 23, parent: 'women' },
];

interface Print {
  name: string;
  hex: string;
  photo: string;
}

const PRODUCTS: {
  slug: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  garment: Garment;
  short: string;
  description: string;
  details: string[];
  prints: Print[];
}[] = [
  {
    slug: 'adaeze-ankara-wide-leg-trouser',
    name: 'Adaeze Ankara Wide-Leg Trouser',
    sku: 'MOM-W-TRS-001',
    category: 'womens-trousers',
    price: 48000,
    garment: Garment.trouser,
    short: 'High-waisted wide-leg trouser in bold ankara.',
    description:
      'A high-rise, wide-leg trouser cut from wax-print ankara, with side pockets and a clean flat front. Each print is a small run — when a cloth is gone, it is gone.',
    details: ['High-rise waist with concealed zip', 'Wide leg, full length', 'Side-seam pockets', '100% cotton wax print'],
    prints: [
      { name: 'Sunburst', hex: '#C2662D', photo: 'ladiesankarapant' },
      { name: 'Bloom', hex: '#B4472F', photo: 'ladiesankarapant1' },
      { name: 'Ember', hex: '#7A2534', photo: 'ladiesankarapant2' },
      { name: 'Indigo Sun', hex: '#2E3E7A', photo: 'ladiesankarapant3' },
      { name: 'Lagoon', hex: '#1F6F6B', photo: 'ladiesankarapant4' },
      { name: 'Garden', hex: '#6B3A6E', photo: 'ladiesankarapant5' },
    ],
  },
  {
    slug: 'temi-ankara-cargo-short',
    name: 'Temi Ankara Cargo Short',
    sku: 'MOM-W-SHT-001',
    category: 'womens-shorts',
    price: 38000,
    garment: Garment.trouser,
    short: 'Relaxed cargo short in ankara wax print.',
    description:
      'A relaxed, mid-thigh cargo short in ankara wax print, with patch pockets and a belted waist. Made for long Lagos afternoons.',
    details: ['Mid-rise, mid-thigh length', 'Cargo patch pockets', 'Belt loops', '100% cotton wax print'],
    prints: [
      { name: 'Marigold', hex: '#C98A2B', photo: 'ladiesankarashort' },
      { name: 'Saffron', hex: '#D9831F', photo: 'ladiesankarashort1' },
      { name: 'Fern', hex: '#3E6B3A', photo: 'ladiesankarashort2' },
      { name: 'Amber', hex: '#B5651D', photo: 'ladiesankarashort3' },
      { name: 'Olive Leaf', hex: '#6B6236', photo: 'ladiesankarashort4' },
      { name: 'Terracotta', hex: '#A04A2C', photo: 'ladiesankarashort5' },
      { name: 'Tangerine', hex: '#D9732B', photo: 'ladiesankarashort6' },
    ],
  },
  {
    slug: 'kemi-ankara-crop-top-trouser-set',
    name: 'Kemi Ankara Crop Top & Trouser Set',
    sku: 'MOM-W-SET-001',
    category: 'womens-sets',
    price: 72000,
    garment: Garment.set,
    short: 'Matching ankara crop top and wide-leg trouser.',
    description:
      'A two-piece in one print: a fitted crop top and a high-waisted wide-leg trouser. Wear it together for the occasion, apart for everything after.',
    details: ['Fitted crop top with back zip', 'High-waisted wide-leg trouser', 'Sold as a set', '100% cotton wax print'],
    prints: [
      { name: 'Paprika', hex: '#B8501F', photo: 'womenankara' },
      { name: 'Emerald', hex: '#1E6B45', photo: 'womenankara1' },
    ],
  },
  {
    slug: 'bisi-aso-oke-bandeau-set',
    name: 'Bisi Aso-Oke Bandeau Set',
    sku: 'MOM-W-SET-002',
    category: 'womens-sets',
    price: 85000,
    garment: Garment.set,
    short: 'Aso-oke bandeau top with wide striped trouser.',
    description:
      'Hand-woven aso-oke, cut into a structured bandeau and a fluid wide-leg trouser with the stripe running long. Heritage cloth, worn lightly.',
    details: ['Structured bandeau top', 'High-waisted wide-leg trouser', 'Hand-woven aso-oke', 'Dry clean recommended'],
    prints: [{ name: 'Cobalt', hex: '#1F3A8A', photo: 'womenasooke' }],
  },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

async function apply() {
  const ids: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        image: c.image,
        sortOrder: c.sortOrder,
        publishStatus: PublishStatus.published,
        parentId: c.parent ? ids[c.parent] : undefined,
      },
      update: { name: c.name, image: c.image, parentId: c.parent ? ids[c.parent] : null },
    });
    ids[c.slug] = row.id;
  }

  const collections = await prisma.collection.findMany({ where: { slug: { in: ['new-arrivals', 'contemporary'] } } });
  const sizeOptions = await prisma.sizeOption.findMany({ where: { label: { in: SIZES } } });
  const tagNames = ['Womenswear', 'Ready-to-Wear', 'New'];
  const tags = await Promise.all(
    tagNames.map((name) => prisma.tag.upsert({ where: { name }, create: { name }, update: {} })),
  );

  for (const p of PRODUCTS) {
    const images = p.prints.map((print) => img(print.photo));
    const data = {
      name: p.name,
      sku: p.sku,
      categoryId: ids[p.category],
      price: p.price,
      images,
      hoverImage: images[1] ?? null,
      productionType: 'ready_to_wear' as const,
      productType: 'ready_to_wear' as const,
      gender: 'women' as const,
      sizingMode: 'standard' as const,
      garment: p.garment,
      description: p.description,
      shortDescription: p.short,
      details: p.details,
      careInstructions: ['Hand wash cold or gentle cycle, inside out', 'Do not bleach', 'Iron on the reverse'],
      productionDaysStandardMin: 3,
      productionDaysStandardMax: 5,
      productionDaysExpressMin: 1,
      productionDaysExpressMax: 2,
      isNew: true,
      stockQuantity: 24,
      lowStockThreshold: 3,
      publishStatus: PublishStatus.published,
    };
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    const product = existing
      ? await prisma.product.update({ where: { slug: p.slug }, data })
      : await prisma.product.create({ data: { slug: p.slug, ...data } });

    // Replace nested lists so re-runs stay in sync with this file.
    await prisma.productColorVariant.deleteMany({ where: { productId: product.id } });
    await prisma.productColorVariant.createMany({
      data: p.prints.map((print, i) => ({ productId: product.id, name: print.name, hex: print.hex, sortOrder: i, images: [img(print.photo)] })),
    });
    await prisma.productSize.deleteMany({ where: { productId: product.id } });
    await prisma.productSize.createMany({
      data: SIZES.map((label, i) => ({ productId: product.id, label, sortOrder: i, sizeOptionId: sizeOptions.find((o) => o.label === label)?.id })),
    });
    await prisma.productCollection.deleteMany({ where: { productId: product.id } });
    await prisma.productCollection.createMany({ data: collections.map((c) => ({ productId: product.id, collectionId: c.id })) });
    await prisma.productTag.deleteMany({ where: { productId: product.id } });
    await prisma.productTag.createMany({ data: tags.map((t) => ({ productId: product.id, tagId: t.id })) });
    console.log(`${existing ? 'updated' : 'created'} ${p.slug}`);
  }
}

async function revert() {
  const { count } = await prisma.product.deleteMany({ where: { slug: { in: PRODUCTS.map((p) => p.slug) } } });
  await prisma.category.deleteMany({ where: { slug: { in: CATEGORIES.filter((c) => c.parent).map((c) => c.slug) } } });
  await prisma.category.deleteMany({ where: { slug: 'women' } });
  console.log(`removed ${count} products and the Women categories`);
}

(process.argv.includes('--revert') ? revert() : apply())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
