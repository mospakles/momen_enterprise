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
  { slug: 'women', name: 'Women', description: 'Ankara, aso-oke and linen pieces for her, cut in Lagos.', image: img('womens-linen-wide-leg-set-powder'), sortOrder: 20 },
  { slug: 'womens-trousers', name: "Women's Trousers", image: img('womens-asooke-wide-leg-amber'), sortOrder: 21, parent: 'women' },
  { slug: 'womens-shorts', name: "Women's Shorts", image: img('womens-ankara-cargo-short-fern'), sortOrder: 22, parent: 'women' },
  { slug: 'womens-sets', name: "Women's Sets", image: img('womens-asooke-bandeau-set-cobalt'), sortOrder: 23, parent: 'women' },
];

interface Print {
  name: string;
  hex: string;
  /** Main shot first, then any further shots of this colour. */
  photos: string[];
}
const pr = (name: string, hex: string, ...photos: string[]): Print => ({ name, hex, photos });

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
    slug: 'adaeze-ankara-wide-leg-trouser', name: 'Adaeze Ankara Wide-Leg Trouser', sku: 'MOM-W-TRS-001', category: 'womens-trousers', price: 48000, garment: Garment.trouser,
    short: 'High-waisted wide-leg trouser in bold ankara.',
    description: 'A high-rise, wide-leg trouser cut from wax-print ankara, with side pockets and a clean flat front. Each print is a small run — when a cloth is gone, it is gone.',
    details: ['High-rise waist with concealed zip', 'Wide leg, full length', 'Side-seam pockets', '100% cotton wax print'],
    prints: [
      pr('Indigo Sun', '#2E3E7A', 'womens-ankara-wide-leg-indigo-sun'), pr('Sunburst', '#C2662D', 'womens-ankara-wide-leg-sunburst'),
      pr('Bloom', '#B4472F', 'womens-ankara-wide-leg-bloom'), pr('Ember', '#7A2534', 'womens-ankara-wide-leg-ember'),
      pr('Lagoon', '#1F6F6B', 'womens-ankara-wide-leg-lagoon'), pr('Garden', '#6B3A6E', 'womens-ankara-wide-leg-garden'),
    ],
  },
  {
    slug: 'ireti-aso-oke-wide-leg-trouser', name: 'Ireti Aso-Oke Wide-Leg Trouser', sku: 'MOM-W-TRS-002', category: 'womens-trousers', price: 58000, garment: Garment.trouser,
    short: 'High-waisted wide-leg trouser in striped aso-oke.',
    description: 'Hand-woven aso-oke cut into a high-waisted, pleated wide-leg trouser. The stripe runs the full length of the leg for a long, easy line.',
    details: ['High-rise, pleated front', 'Wide leg, full length', 'Hand-woven aso-oke', 'Dry clean recommended'],
    prints: [
      pr('Amber Stripe', '#A8742E', 'womens-asooke-wide-leg-amber'), pr('Cocoa Stripe', '#6B4630', 'womens-asooke-wide-leg-cocoa'),
      pr('Terracotta Stripe', '#A04A2C', 'womens-asooke-wide-leg-terracotta'), pr('Olive Stripe', '#6B6A3A', 'womens-asooke-wide-leg-olive'),
    ],
  },
  {
    slug: 'temi-ankara-cargo-short', name: 'Temi Ankara Cargo Short', sku: 'MOM-W-SHT-001', category: 'womens-shorts', price: 38000, garment: Garment.trouser,
    short: 'Relaxed cargo short in ankara wax print.',
    description: 'A relaxed, mid-thigh cargo short in ankara wax print, with patch pockets and a belted waist. Made for long Lagos afternoons.',
    details: ['Mid-rise, mid-thigh length', 'Cargo patch pockets', 'Belt loops', '100% cotton wax print'],
    prints: [
      pr('Fern', '#3E6B3A', 'womens-ankara-cargo-short-fern'), pr('Marigold', '#C98A2B', 'womens-ankara-cargo-short-marigold'),
      pr('Saffron', '#D9831F', 'womens-ankara-cargo-short-saffron'), pr('Amber', '#B5651D', 'womens-ankara-cargo-short-amber'),
      pr('Olive Leaf', '#6B6236', 'womens-ankara-cargo-short-olive-leaf'), pr('Terracotta', '#A04A2C', 'womens-ankara-cargo-short-terracotta'),
      pr('Tangerine', '#D9732B', 'womens-ankara-cargo-short-tangerine'),
    ],
  },
  {
    slug: 'ada-linen-wide-leg-set', name: 'Ada Linen Wide-Leg Set', sku: 'MOM-W-SET-003', category: 'womens-sets', price: 68000, garment: Garment.set,
    short: 'Camp-collar linen shirt and matching wide trouser.',
    description: 'A relaxed camp-collar shirt and a high-waisted wide trouser in the same washed linen. One piece of thinking, beautifully done.',
    details: ['Two-piece: shirt and wide trousers', 'Washed linen', 'Camp collar, chest pocket', 'Machine wash cold'],
    prints: [
      pr('Powder Blue', '#A9C6E8', 'womens-linen-wide-leg-set-powder'), pr('Mustard', '#D4A82E', 'womens-linen-wide-leg-set-mustard'),
      pr('Blush', '#E8B9BF', 'womens-linen-wide-leg-set-blush'), pr('Olive', '#6B6A3A', 'womens-linen-wide-leg-set-olive'),
      pr('Ivory', '#EFE8DA', 'womens-linen-wide-leg-set-ivory'), pr('White', '#F6F4EF', 'womens-linen-wide-leg-set-white'),
      pr('Onyx', '#1A1A1A', 'womens-linen-wide-leg-set-onyx'), pr('Brick', '#A54A3A', 'womens-linen-wide-leg-set-brick'),
    ],
  },
  {
    slug: 'ada-linen-short-set', name: 'Ada Linen Short Set', sku: 'MOM-W-SET-004', category: 'womens-sets', price: 55000, garment: Garment.set,
    short: 'Camp-collar linen shirt and matching short.',
    description: 'Our camp-collar linen shirt with a matching relaxed short — the set for warm weekends and slow holidays.',
    details: ['Two-piece: shirt and shorts', 'Washed linen', 'Camp collar, chest pocket', 'Machine wash cold'],
    prints: [
      pr('Mustard', '#D4A82E', 'womens-linen-short-set-mustard'), pr('Blush', '#E8B9BF', 'womens-linen-short-set-blush'),
      pr('Powder Blue', '#A9C6E8', 'womens-linen-short-set-powder'), pr('Ivory', '#EFE8DA', 'womens-linen-short-set-ivory'),
    ],
  },
  {
    slug: 'ife-camp-collar-linen-shirt', name: 'Ife Camp-Collar Linen Shirt', sku: 'MOM-W-SHT-002', category: 'women', price: 36000, garment: Garment.top,
    short: 'Relaxed camp-collar shirt in washed linen.',
    description: 'A relaxed camp-collar shirt in washed linen, shown with our wide trousers and shorts. The shirt that goes with everything else you own.',
    details: ['Washed linen', 'Camp collar, chest pocket', 'Relaxed fit', 'Machine wash cold'],
    prints: [
      pr('Sage', '#A7B79A', 'womens-linen-shirt-sage-ivory-trousers', 'womens-linen-shirt-sage-ivory-shorts', 'womens-linen-shirt-sage-ivory-shorts-heels'),
      pr('Rose', '#C98F8C', 'womens-linen-shirt-rose-chocolate-trousers', 'womens-linen-shirt-rose-cocoa-shorts', 'womens-linen-shirt-rose-cocoa-shorts-heels'),
      pr('Terracotta', '#B4522A', 'womens-linen-shirt-terracotta-ivory-trousers', 'womens-linen-shirt-terracotta-sand-shorts'),
      pr('Powder Blue', '#A9C6E8', 'womens-linen-shirt-powder-navy-trousers', 'womens-linen-shirt-powder-navy-shorts'),
      pr('Ivory', '#EFE8DA', 'womens-linen-shirt-ivory-black-trousers', 'womens-linen-shirt-ivory-black-shorts'),
      pr('Mustard', '#D4A82E', 'womens-linen-shirt-mustard-ivory-trousers'),
    ],
  },
  {
    slug: 'kemi-ankara-crop-top-trouser-set', name: 'Kemi Ankara Crop Top & Trouser Set', sku: 'MOM-W-SET-001', category: 'womens-sets', price: 72000, garment: Garment.set,
    short: 'Matching ankara crop top and wide-leg trouser.',
    description: 'A two-piece in one print: a fitted crop top and a high-waisted wide-leg trouser. Wear it together for the occasion, apart for everything after.',
    details: ['Fitted crop top with back zip', 'High-waisted wide-leg trouser', 'Sold as a set', '100% cotton wax print'],
    prints: [pr('Paprika', '#B8501F', 'womens-ankara-set-paprika'), pr('Emerald', '#1E6B45', 'womens-ankara-set-emerald')],
  },
  {
    slug: 'bisi-aso-oke-bandeau-set', name: 'Bisi Aso-Oke Bandeau Set', sku: 'MOM-W-SET-002', category: 'womens-sets', price: 85000, garment: Garment.set,
    short: 'Aso-oke bandeau top with wide striped trouser.',
    description: 'Hand-woven aso-oke, cut into a structured bandeau and a fluid wide-leg trouser with the stripe running long. Heritage cloth, worn lightly.',
    details: ['Structured bandeau top', 'High-waisted wide-leg trouser', 'Hand-woven aso-oke', 'Dry clean recommended'],
    prints: [pr('Cobalt', '#1F3A8A', 'womens-asooke-bandeau-set-cobalt')],
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
    // Gallery: each print's main shot first, then the extra shots.
    const images = [...p.prints.map((print) => img(print.photos[0])), ...p.prints.flatMap((print) => print.photos.slice(1).map(img))];
    const data = {
      name: p.name,
      sku: p.sku,
      categoryId: ids[p.category],
      price: p.price,
      images,
      hoverImage: p.prints[0].photos[1] ? img(p.prints[0].photos[1]) : images[1] ?? null,
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
      data: p.prints.map((print, i) => ({ productId: product.id, name: print.name, hex: print.hex, sortOrder: i, images: print.photos.map(img) })),
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
