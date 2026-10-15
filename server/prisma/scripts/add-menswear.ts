/**
 * Creates the momen. menswear range from the brand photography in
 * public/images/brand: ten products whose colourways are the individual
 * photographed colours, plus the categories and collections the storefront
 * menus, lookbook and occasion pages link to.
 *
 * Safe to re-run (upserts by slug). `--revert` removes the products only
 * (categories/collections are shared with other products).
 *
 *   npx ts-node prisma/scripts/add-menswear.ts
 *   npx ts-node prisma/scripts/add-menswear.ts --revert
 *
 * PRICES ARE PROPOSALS — confirm them in Admin → Products before launch.
 */
import { Garment, PrismaClient, PublishStatus } from '@prisma/client';

const prisma = new PrismaClient();
const img = (name: string) => `/images/brand/${name}.jpg`;

const CATEGORIES = [
  { slug: 'agbada', name: 'Agbada', description: 'Complete agbada sets, embroidered by hand.', image: 'agbada11', sortOrder: 1 },
  { slug: 'kaftans', name: 'Kaftans', description: 'Kaftan and senator sets, clean or embroidered.', image: 'kaftan13', sortOrder: 2 },
  { slug: 'shirts', name: 'Shirts', description: 'Mandarin-collar shirts in jacquard and linen.', image: 'shirt1', sortOrder: 3 },
  { slug: 'pants', name: 'Trousers', description: 'Aso-oke and ankara cargo trousers.', image: 'menasooke3', sortOrder: 4 },
  { slug: 'casual-wear', name: 'Two-Piece Sets', description: 'Matching shirt-and-short or shirt-and-trouser sets.', image: '2pieceshort15', sortOrder: 5 },
];

const COLLECTIONS = [
  { slug: 'new-arrivals', name: 'New Arrivals', tag: 'New', image: 'menankara7', sortOrder: 1, description: 'The latest pieces to leave the momen. atelier.' },
  { slug: 'signature', name: 'The momen. Signature', tag: 'Signature', image: 'agbada2', sortOrder: 2, description: 'The pieces that define the house.' },
  { slug: 'occasion', name: 'Occasion', tag: 'Occasion', image: 'agbada9', sortOrder: 3, description: 'For weddings, owambe and every room worth dressing for.' },
  { slug: 'everyday', name: 'Everyday', tag: 'Everyday', image: 'kaftan4', sortOrder: 4, description: 'Easy, considered pieces for every day of the week.' },
  { slug: 'heritage', name: 'Heritage', tag: 'Heritage', image: 'agbada12', sortOrder: 5, description: 'Traditional garments, drawn with a modern hand.' },
  { slug: 'contemporary', name: 'Contemporary', tag: 'Contemporary', image: 'menasooke4', sortOrder: 6, description: 'Heritage cloth in modern shapes.' },
];

interface Colour {
  name: string;
  hex: string;
  photo: string;
}

const PRODUCTS: {
  slug: string;
  name: string;
  sku: string;
  category: string;
  collections: string[];
  price: number;
  garment: Garment;
  sizes: string[];
  isSignature?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  short: string;
  description: string;
  details: string[];
  colours: Colour[];
}[] = [
  {
    slug: 'adebayo-signature-agbada',
    name: 'Adebayo Signature Agbada',
    sku: 'MOM-M-AGB-001',
    category: 'agbada',
    collections: ['signature', 'occasion', 'heritage'],
    price: 185000,
    garment: Garment.agbada,
    sizes: ['M', 'L', 'XL', 'XXL', 'XXXL'],
    isSignature: true,
    isFeatured: true,
    short: 'Three-piece agbada with hand-embroidered chest panel.',
    description:
      'The full three-piece: flowing agbada, inner kaftan and trousers, with a hand-embroidered chest panel in tonal thread. Cut generously so it moves when you do.',
    details: ['Three-piece set: agbada, inner kaftan, trousers', 'Hand-embroidered chest panel', 'Matching cap available on request', 'Made to measure on request'],
    colours: [
      { name: 'Burgundy', hex: '#6E1F2A', photo: 'agbada' },
      { name: 'Cocoa', hex: '#5A3A28', photo: 'agbada10' },
      { name: 'Emerald', hex: '#1F5B3F', photo: 'agbada11' },
      { name: 'Wine', hex: '#5B1E28', photo: 'agbada12' },
      { name: 'Gold', hex: '#B08A4A', photo: 'agbada8' },
      { name: 'Burnt Orange', hex: '#C2551F', photo: 'agbada9' },
      { name: 'Olive', hex: '#5E5A32', photo: 'agbbada4' },
    ],
  },
  {
    slug: 'oba-ivory-agbada',
    name: 'Oba Ivory Agbada',
    sku: 'MOM-M-AGB-002',
    category: 'agbada',
    collections: ['occasion', 'heritage', 'signature'],
    price: 210000,
    garment: Garment.agbada,
    sizes: ['M', 'L', 'XL', 'XXL', 'XXXL'],
    isFeatured: true,
    short: 'Ivory agbada for the wedding and the photographs after.',
    description:
      'Ivory cloth carrying hand-placed embroidery in gold or onyx thread. The agbada we cut for grooms, fathers of the bride and every day that will be remembered.',
    details: ['Three-piece set: agbada, inner kaftan, trousers', 'Hand-placed embroidery', 'Made to measure on request', 'Dry clean only'],
    colours: [
      { name: 'Ivory & Gold', hex: '#EFE6CF', photo: 'agbada2' },
      { name: 'Pearl', hex: '#F2EEE4', photo: 'agbada5' },
      { name: 'Ivory & Onyx', hex: '#E9E4DA', photo: 'agbada6' },
      { name: 'Ivory Gold Bloom', hex: '#EDE2C6', photo: 'agbada7' },
    ],
  },
  {
    slug: 'tunde-classic-kaftan',
    name: 'Tunde Classic Kaftan',
    sku: 'MOM-M-KFT-001',
    category: 'kaftans',
    collections: ['everyday', 'signature'],
    price: 95000,
    garment: Garment.set,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isSignature: true,
    short: 'Clean two-piece kaftan with a mandarin neckline.',
    description:
      'A clean kaftan and trouser in a single colour — mandarin neck, concealed placket, a straight fall to the thigh. The piece you will reach for most.',
    details: ['Two-piece: kaftan and trousers', 'Mandarin neckline, concealed placket', 'Side-seam pockets', 'Made to measure on request'],
    colours: [
      { name: 'Camel', hex: '#C2A07A', photo: 'kaftan' },
      { name: 'Charcoal', hex: '#4A4A4C', photo: 'kaftan1' },
      { name: 'Sand', hex: '#D8C8AE', photo: 'kaftan4' },
      { name: 'Burnt Orange', hex: '#C2551F', photo: 'kaftan5' },
      { name: 'White', hex: '#F4F2EE', photo: 'kaftan6' },
      { name: 'Onyx', hex: '#1A1A1A', photo: 'kaftan7' },
      { name: 'Navy', hex: '#1F2B4D', photo: 'kaftan12' },
      { name: 'Steel Blue', hex: '#5F7A99', photo: 'kaftan13' },
    ],
  },
  {
    slug: 'obinna-embroidered-kaftan',
    name: 'Obinna Embroidered Kaftan',
    sku: 'MOM-M-KFT-002',
    category: 'kaftans',
    collections: ['occasion', 'heritage'],
    price: 120000,
    garment: Garment.set,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isFeatured: true,
    short: 'Kaftan with tonal hand embroidery at the chest.',
    description:
      'Our classic kaftan, finished with tonal embroidery placed by hand across the chest. Quiet from a distance, extraordinary up close.',
    details: ['Two-piece: kaftan and trousers', 'Tonal hand embroidery', 'Mandarin neckline', 'Made to measure on request'],
    colours: [
      { name: 'Taupe', hex: '#8C7B68', photo: 'kaftan8' },
      { name: 'Cocoa', hex: '#4E3527', photo: 'kaftan10' },
      { name: 'Midnight', hex: '#1C2340', photo: 'kaftan11' },
    ],
  },
  {
    slug: 'kola-jacquard-mandarin-shirt',
    name: 'Kola Jacquard Mandarin Shirt',
    sku: 'MOM-M-SHT-001',
    category: 'shirts',
    collections: ['contemporary', 'new-arrivals'],
    price: 55000,
    garment: Garment.top,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isNew: true,
    short: 'Textured jacquard shirt with a mandarin collar.',
    description:
      'A long-sleeve mandarin-collar shirt in a woven jacquard that catches the light. Wear it buttoned with wide trousers, or open over a tee.',
    details: ['Mandarin collar', 'Woven jacquard', 'Relaxed fit', 'Pairs with our wide trousers'],
    colours: [
      { name: 'Rust', hex: '#B4522A', photo: 'shirt' },
      { name: 'Forest', hex: '#1F4A33', photo: 'shirt1' },
      { name: 'Cobalt', hex: '#1F3A8A', photo: 'shirt2' },
    ],
  },
  {
    slug: 'tobi-linen-mandarin-shirt',
    name: 'Tobi Linen Mandarin Shirt',
    sku: 'MOM-M-SHT-002',
    category: 'shirts',
    collections: ['everyday'],
    price: 48000,
    garment: Garment.top,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    short: 'Breathable linen shirt with a mandarin collar.',
    description: 'Pure linen, a mandarin collar and a relaxed cut — built for heat, made to look considered in it.',
    details: ['100% linen', 'Mandarin collar', 'Relaxed fit', 'Machine wash cold'],
    colours: [
      { name: 'Sky', hex: '#A9C6E8', photo: 'shirt3' },
      { name: 'Blush', hex: '#E8B9BF', photo: 'shirt4' },
      { name: 'Sage', hex: '#A7B79A', photo: 'shirt5' },
      { name: 'Stone', hex: '#D9CFBE', photo: 'shirt6' },
    ],
  },
  {
    slug: 'lekki-short-two-piece',
    name: 'Lekki Short Two-Piece',
    sku: 'MOM-M-SET-001',
    category: 'casual-wear',
    collections: ['everyday', 'new-arrivals'],
    price: 65000,
    garment: Garment.set,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isNew: true,
    isFeatured: true,
    short: 'Short-sleeve shirt and matching short in linen.',
    description:
      'A short-sleeve shirt and matching short in breathable linen, some finished with a woven trim at the pocket and cuff. Fifteen colours for long Lagos afternoons.',
    details: ['Two-piece: shirt and short', 'Breathable linen', 'Woven trim on selected colours', 'Machine wash cold'],
    colours: [
      { name: 'Olive', hex: '#6B6A3A', photo: '2pieceshort' },
      { name: 'Midnight', hex: '#1F2B4D', photo: '2pieceshort10' },
      { name: 'Teal', hex: '#1F6F6B', photo: '2pieceshort11' },
      { name: 'Onyx', hex: '#1A1A1A', photo: '2pieceshort12' },
      { name: 'White', hex: '#F4F2EE', photo: '2pieceshort13' },
      { name: 'Navy Trim', hex: '#26355E', photo: '2pieceshort14' },
      { name: 'Mint', hex: '#A8D5C2', photo: '2pieceshort15' },
      { name: 'Sand', hex: '#D9C9A8', photo: '2pieceshort2' },
      { name: 'Wine', hex: '#6B1F2E', photo: '2pieceshort3' },
      { name: 'Scarlet', hex: '#B3262A', photo: '2pieceshort4' },
      { name: 'Cream', hex: '#EDE3CF', photo: '2pieceshort5' },
      { name: 'Blush', hex: '#E8B9BF', photo: '2pieceshort6' },
      { name: 'Cocoa', hex: '#5A3A28', photo: '2pieceshort7' },
      { name: 'Sky', hex: '#A9C6E8', photo: '2pieceshort8' },
      { name: 'Forest', hex: '#1F4A33', photo: '2pieceshort9' },
    ],
  },
  {
    slug: 'ikoyi-long-two-piece',
    name: 'Ikoyi Long Two-Piece',
    sku: 'MOM-M-SET-002',
    category: 'casual-wear',
    collections: ['everyday', 'contemporary'],
    price: 78000,
    garment: Garment.set,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    short: 'Long-sleeve shirt and wide trouser, one colour.',
    description:
      'A mandarin-collar long-sleeve shirt and an easy wide-leg trouser in the same cloth. One decision, dressed.',
    details: ['Two-piece: shirt and trousers', 'Mandarin collar', 'Wide-leg trouser with pleat', 'Made to measure on request'],
    colours: [
      { name: 'White & Stone', hex: '#F1EDE4', photo: '2piecelong' },
      { name: 'Onyx', hex: '#1A1A1A', photo: '2piecelong1' },
      { name: 'Cocoa', hex: '#5A3A28', photo: '2piecelong2' },
      { name: 'Olive', hex: '#6B6A3A', photo: '2piecelong3' },
      { name: 'Midnight', hex: '#15161A', photo: '2piecelong6' },
    ],
  },
  {
    slug: 'ola-aso-oke-cargo-trouser',
    name: 'Ola Aso-Oke Cargo Trouser',
    sku: 'MOM-M-TRS-001',
    category: 'pants',
    collections: ['contemporary', 'heritage'],
    price: 68000,
    garment: Garment.trouser,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isNew: true,
    short: 'Wide cargo trouser in striped aso-oke.',
    description:
      'Hand-woven aso-oke, cut into a wide cargo trouser with deep patch pockets and a drawstring waist. Heritage cloth, worn like you mean it.',
    details: ['Hand-woven aso-oke', 'Wide leg with cargo pockets', 'Drawstring waist', 'Dry clean recommended'],
    colours: [
      { name: 'Rust Stripe', hex: '#A04A2C', photo: 'menasooke' },
      { name: 'Green Stripe', hex: '#2E5A3A', photo: 'menasooke1' },
      { name: 'Olive Stripe', hex: '#7A6A2E', photo: 'menasooke13' },
      { name: 'Onyx & Gold', hex: '#2A241A', photo: 'menasooke2' },
      { name: 'Forest & Onyx', hex: '#1F3A2A', photo: 'menasooke3' },
      { name: 'Grey Stripe', hex: '#6B6B6B', photo: 'menasooke4' },
      { name: 'Burgundy Stripe', hex: '#6B1F2E', photo: 'menasooke5' },
    ],
  },
  {
    slug: 'bola-ankara-cargo-trouser',
    name: 'Bola Ankara Cargo Trouser',
    sku: 'MOM-M-TRS-002',
    category: 'pants',
    collections: ['contemporary', 'new-arrivals'],
    price: 58000,
    garment: Garment.trouser,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    isNew: true,
    short: 'Relaxed cargo trouser in bold ankara print.',
    description: 'A relaxed, wide cargo trouser in ankara wax print with a drawstring waist. Pair it with a plain tee and let the cloth talk.',
    details: ['100% cotton wax print', 'Wide leg with cargo pockets', 'Drawstring waist', 'Machine wash cold, inside out'],
    colours: [
      { name: 'Kente', hex: '#C98A2B', photo: 'menankara' },
      { name: 'Monochrome', hex: '#2A2A2A', photo: 'menankara1' },
      { name: 'Kente Gold', hex: '#B5651D', photo: 'menankara3' },
      { name: 'Onyx Geo', hex: '#1A1A1A', photo: 'menankara4' },
      { name: 'Grey Geo', hex: '#8A8A8A', photo: 'menankara5' },
      { name: 'Burgundy Geo', hex: '#6B1F2E', photo: 'menankara6' },
      { name: 'Green Sun', hex: '#2E7A3A', photo: 'menankara7' },
      { name: 'Orange Geo', hex: '#D9732B', photo: 'menankara8' },
    ],
  },
];

async function apply() {
  const categoryIds: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, image: img(c.image), sortOrder: c.sortOrder, publishStatus: PublishStatus.published },
      update: { image: img(c.image), publishStatus: PublishStatus.published },
    });
    categoryIds[c.slug] = row.id;
  }

  const collectionIds: Record<string, string> = {};
  for (const c of COLLECTIONS) {
    const row = await prisma.collection.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, tag: c.tag, image: img(c.image), sortOrder: c.sortOrder, publishStatus: PublishStatus.published },
      update: { image: img(c.image), publishStatus: PublishStatus.published },
    });
    collectionIds[c.slug] = row.id;
  }

  const sizeOptions = await prisma.sizeOption.findMany();
  const tags = await Promise.all(
    ['Menswear', 'Ready-to-Wear', 'New'].map((name) => prisma.tag.upsert({ where: { name }, create: { name }, update: {} })),
  );

  for (const p of PRODUCTS) {
    const images = p.colours.map((c) => img(c.photo));
    const data = {
      name: p.name,
      sku: p.sku,
      categoryId: categoryIds[p.category],
      price: p.price,
      images,
      hoverImage: images[1] ?? null,
      productionType: 'ready_to_wear' as const,
      productType: 'ready_to_wear' as const,
      gender: 'men' as const,
      sizingMode: 'standard' as const,
      garment: p.garment,
      description: p.description,
      shortDescription: p.short,
      details: p.details,
      careInstructions: ['Dry clean or hand wash cold', 'Do not bleach', 'Iron on the reverse'],
      productionDaysStandardMin: 3,
      productionDaysStandardMax: 5,
      productionDaysExpressMin: 1,
      productionDaysExpressMax: 2,
      isNew: p.isNew ?? false,
      isFeatured: p.isFeatured ?? false,
      isSignature: p.isSignature ?? false,
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
      data: p.colours.map((c, i) => ({ productId: product.id, name: c.name, hex: c.hex, sortOrder: i, images: [img(c.photo)] })),
    });
    await prisma.productSize.deleteMany({ where: { productId: product.id } });
    await prisma.productSize.createMany({
      data: p.sizes.map((label, i) => ({ productId: product.id, label, sortOrder: i, sizeOptionId: sizeOptions.find((o) => o.label === label)?.id })),
    });
    await prisma.productCollection.deleteMany({ where: { productId: product.id } });
    await prisma.productCollection.createMany({ data: p.collections.map((slug) => ({ productId: product.id, collectionId: collectionIds[slug] })) });
    await prisma.productTag.deleteMany({ where: { productId: product.id } });
    await prisma.productTag.createMany({
      data: tags.filter((t) => t.name !== 'New' || p.isNew).map((t) => ({ productId: product.id, tagId: t.id })),
    });
    console.log(`${existing ? 'updated' : 'created'} ${p.slug} (${p.colours.length} colours)`);
  }
}

async function revert() {
  const { count } = await prisma.product.deleteMany({ where: { slug: { in: PRODUCTS.map((p) => p.slug) } } });
  console.log(`removed ${count} menswear products`);
}

(process.argv.includes('--revert') ? revert() : apply())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
