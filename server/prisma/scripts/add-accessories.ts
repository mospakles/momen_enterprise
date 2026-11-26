/**
 * Creates the momen. accessories range from the curated brand photography:
 * woven fila caps, palm sandals, leather shoes, bags and bracelets, under an
 * "Accessories" category with caps / footwear / bags / other underneath.
 *
 * Safe to re-run (upserts by slug). Placeholder products these photographs
 * replace (see SUPERSEDED) are set to draft. `--revert` removes the new
 * products and republishes the placeholders.
 *
 *   npx ts-node prisma/scripts/add-accessories.ts
 *   npx ts-node prisma/scripts/add-accessories.ts --revert
 *
 * PRICES ARE PROPOSALS — confirm them in Admin → Products before launch.
 */
import { PrismaClient, PublishStatus } from '@prisma/client';

const prisma = new PrismaClient();
const img = (name: string) => `/images/brand/${name}.jpg`;

const CATEGORIES = [
  { slug: 'accessories', name: 'Accessories', description: 'The finishing pieces: caps, sandals, shoes, leather and stone.', image: 'accessories-still-life', sortOrder: 10 },
  { slug: 'caps', name: 'Caps', description: 'Hand-woven fila caps.', image: 'cap-fila-gold', sortOrder: 11, parent: 'accessories' },
  { slug: 'footwear', name: 'Footwear', description: 'Palm sandals, loafers and oxfords in leather.', image: 'shoes-oxford-cognac', sortOrder: 12, parent: 'accessories' },
  { slug: 'bags', name: 'Bags', description: 'Leather crossbody bags and briefcases.', image: 'bag-briefcase-brown', sortOrder: 13, parent: 'accessories' },
  { slug: 'other-accessories', name: 'Other Accessories', description: 'Bracelets and small leather goods.', image: 'bracelet-trio-stone-leather', sortOrder: 14, parent: 'accessories' },
];

interface Colour {
  name: string;
  hex: string;
  photos: string[];
}
const c = (name: string, hex: string, ...photos: string[]): Colour => ({ name, hex, photos });
const SHOE = ['40', '41', '42', '43', '44', '45', '46'];

const PRODUCTS: { slug: string; name: string; sku: string; category: string; price: number; sizes: string[]; collections: string[]; short: string; description: string; details: string[]; care: string[]; colours: Colour[]; isFeatured?: boolean }[] = [
  {
    slug: 'oba-woven-fila-cap', name: 'Oba Woven Fila Cap', sku: 'MOM-A-CAP-001', category: 'caps', price: 18000, sizes: ['One Size'], collections: ['heritage', 'occasion'], isFeatured: true,
    short: 'Hand-woven fila cap with geometric band.',
    description: 'A structured fila cap woven with a geometric band and folded crown — the finishing touch for agbada, kaftan and jalabia.',
    details: ['Hand-woven', 'Geometric band, folded crown', 'One size, softly structured', 'Pairs with every colour of our agbada'],
    care: ['Spot clean only', 'Store stuffed to keep its shape'],
    colours: [
      c('Gold', '#C9A04A', 'cap-fila-gold'), c('Onyx', '#1A1A1A', 'cap-fila-onyx'), c('Cocoa', '#5A3A28', 'cap-fila-cocoa'),
      c('Navy', '#1F2B4D', 'cap-fila-navy'), c('Wine', '#6B1F2E', 'cap-fila-wine'), c('Emerald', '#1F5B3F', 'cap-fila-emerald'),
      c('Onyx & Ivory', '#2A2A2A', 'cap-fila-onyx-ivory'), c('Silver', '#A8A8A8', 'cap-fila-silver'),
    ],
  },
  {
    slug: 'ikoyi-cross-strap-palm-sandal', name: 'Ikoyi Cross-Strap Palm Sandal', sku: 'MOM-A-FTW-001', category: 'footwear', price: 28000, sizes: SHOE, collections: ['everyday'],
    short: 'Leather palm sandal with crossed straps.',
    description: 'The classic Lagos palm, made in full-grain leather with two crossed straps and a stitched sole. Wear it with kaftan, jalabia or linen.',
    details: ['Full-grain leather upper', 'Stitched leather sole', 'Cushioned footbed'],
    care: ['Wipe clean with a damp cloth', 'Condition the leather occasionally'],
    colours: [c('Brown', '#6B3A22', 'sandals-palm-cross-strap-brown'), c('Black', '#1A1A1A', 'sandals-palm-cross-strap-black')],
  },
  {
    slug: 'lekki-woven-palm-sandal', name: 'Lekki Woven Palm Sandal', sku: 'MOM-A-FTW-002', category: 'footwear', price: 32000, sizes: SHOE, collections: ['everyday', 'contemporary'],
    short: 'Palm sandal with woven leather straps.',
    description: 'A palm sandal with three woven leather straps over a slim sole — a little more considered than the classic.',
    details: ['Woven leather straps', 'Slim stitched sole', 'Cushioned footbed'],
    care: ['Wipe clean with a damp cloth', 'Condition the leather occasionally'],
    colours: [c('Brown', '#7A4528', 'sandals-palm-woven-brown'), c('White', '#F4F2EE', 'sandals-palm-woven-white')],
  },
  {
    slug: 'cognac-cap-toe-oxford', name: 'Cognac Cap-Toe Oxford', sku: 'MOM-A-FTW-003', category: 'footwear', price: 75000, sizes: SHOE, collections: ['signature', 'occasion'],
    short: 'Leather cap-toe oxford in burnished cognac.',
    description: 'A burnished cognac cap-toe oxford with a leather sole — the shoe for the wedding, the office and everything formal in between.',
    details: ['Calf leather, burnished by hand', 'Leather sole', 'Closed lacing'],
    care: ['Polish regularly', 'Use shoe trees'],
    colours: [c('Cognac', '#8A4A22', 'shoes-oxford-cognac')],
  },
  {
    slug: 'cognac-penny-loafer', name: 'Cognac Penny Loafer', sku: 'MOM-A-FTW-004', category: 'footwear', price: 70000, sizes: SHOE, collections: ['everyday', 'signature'],
    short: 'Leather penny loafer in burnished cognac.',
    description: 'A soft, burnished cognac penny loafer. With a kaftan and trousers it says everything it needs to.',
    details: ['Calf leather, burnished by hand', 'Leather sole', 'Slip-on'],
    care: ['Polish regularly', 'Use shoe trees'],
    colours: [c('Cognac', '#8A4A22', 'shoes-penny-loafer-cognac')],
  },
  {
    slug: 'ikeja-leather-crossbody', name: 'Ikeja Leather Crossbody', sku: 'MOM-A-BAG-001', category: 'bags', price: 65000, sizes: ['One Size'], collections: ['everyday', 'contemporary'],
    short: 'Leather crossbody bag with flap closure.',
    description: 'A compact leather crossbody with a flap front and adjustable strap — phone, wallet and keys, carried well.',
    details: ['Full-grain leather', 'Flap closure, inner pocket', 'Adjustable strap'],
    care: ['Wipe clean', 'Condition the leather occasionally'],
    colours: [c('Brown', '#6B3A22', 'bag-crossbody-brown'), c('Black', '#1A1A1A', 'bag-crossbody-black')],
  },
  {
    slug: 'marina-leather-briefcase', name: 'Marina Leather Briefcase', sku: 'MOM-A-BAG-002', category: 'bags', price: 120000, sizes: ['One Size'], collections: ['signature', 'everyday'], isFeatured: true,
    short: 'Leather briefcase with top handles and shoulder strap.',
    description: 'A full-grain leather briefcase with twin top handles, a detachable shoulder strap and room for a laptop.',
    details: ['Full-grain leather', 'Fits a 15" laptop', 'Detachable shoulder strap'],
    care: ['Wipe clean', 'Condition the leather occasionally'],
    colours: [c('Brown', '#6B3A22', 'bag-briefcase-brown'), c('Black', '#1A1A1A', 'bag-briefcase-black')],
  },
  {
    slug: 'stone-and-leather-bracelet-trio', name: 'Stone & Leather Bracelet Trio', sku: 'MOM-A-ACC-001', category: 'other-accessories', price: 22000, sizes: ['One Size'], collections: ['everyday'],
    short: 'Onyx, tiger’s-eye and braided leather bracelets.',
    description: 'Three bracelets to wear together or apart: polished onyx, tiger’s-eye and a braided leather band with a steel clasp.',
    details: ['Set of three', 'Onyx and tiger’s-eye beads', 'Braided leather with steel clasp'],
    care: ['Keep away from water and perfume'],
    colours: [c('Onyx & Tiger’s-Eye', '#3A2A1A', 'bracelet-trio-stone-leather', 'bracelet-trio-stone-leather-alt')],
  },
];

// Placeholder-image products (created in admin) that the photographed pieces
// above replace. They are set to draft, never deleted; --revert republishes.
const SUPERSEDED = ['classic-pam-sandals', 'leather-woven-sandals', 'aso-oke-cap-fila', 'structured-leather-bag', 'beaded-bracelet-set', 'yusuf-traditional-jalabia'];

async function apply() {
  const ids: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { slug: cat.slug, name: cat.name, description: cat.description, image: img(cat.image), sortOrder: cat.sortOrder, publishStatus: PublishStatus.published, parentId: cat.parent ? ids[cat.parent] : undefined },
      update: { image: img(cat.image), publishStatus: PublishStatus.published, parentId: cat.parent ? ids[cat.parent] : null },
    });
    ids[cat.slug] = row.id;
  }
  const collections = await prisma.collection.findMany();
  const sizeOptions = await prisma.sizeOption.findMany();
  const tags = await Promise.all(['Accessories', 'Ready-to-Wear'].map((name) => prisma.tag.upsert({ where: { name }, create: { name }, update: {} })));

  for (const p of PRODUCTS) {
    const images = [...p.colours.map((col) => img(col.photos[0])), ...p.colours.flatMap((col) => col.photos.slice(1).map(img))];
    const oneSize = p.sizes.length === 1;
    const data = {
      name: p.name, sku: p.sku, categoryId: ids[p.category], price: p.price, images,
      hoverImage: p.colours[0].photos[1] ? img(p.colours[0].photos[1]) : images[1] ?? null,
      productionType: 'ready_to_wear' as const, productType: 'accessory' as const, gender: 'men' as const,
      sizingMode: oneSize ? ('one_size' as const) : ('standard' as const), garment: 'accessory' as const,
      description: p.description, shortDescription: p.short, details: p.details, careInstructions: p.care,
      productionDaysStandardMin: 2, productionDaysStandardMax: 4, productionDaysExpressMin: 1, productionDaysExpressMax: 2,
      isNew: true, isFeatured: p.isFeatured ?? false, stockQuantity: 30, lowStockThreshold: 4, publishStatus: PublishStatus.published,
    };
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    const product = existing ? await prisma.product.update({ where: { slug: p.slug }, data }) : await prisma.product.create({ data: { slug: p.slug, ...data } });

    await prisma.productColorVariant.deleteMany({ where: { productId: product.id } });
    await prisma.productColorVariant.createMany({ data: p.colours.map((col, i) => ({ productId: product.id, name: col.name, hex: col.hex, sortOrder: i, images: col.photos.map(img) })) });
    await prisma.productSize.deleteMany({ where: { productId: product.id } });
    await prisma.productSize.createMany({ data: p.sizes.map((label, i) => ({ productId: product.id, label, sortOrder: i, sizeOptionId: sizeOptions.find((o) => o.label === label)?.id })) });
    await prisma.productCollection.deleteMany({ where: { productId: product.id } });
    await prisma.productCollection.createMany({
      data: p.collections.map((slug) => collections.find((col) => col.slug === slug)).filter((col): col is NonNullable<typeof col> => Boolean(col)).map((col) => ({ productId: product.id, collectionId: col.id })),
    });
    await prisma.productTag.deleteMany({ where: { productId: product.id } });
    await prisma.productTag.createMany({ data: tags.map((t) => ({ productId: product.id, tagId: t.id })) });
    console.log(`${existing ? 'updated' : 'created'} ${p.slug} (${p.colours.length} colours, ${images.length} photos)`);
  }
  const hidden = await prisma.product.updateMany({ where: { slug: { in: SUPERSEDED }, publishStatus: PublishStatus.published }, data: { publishStatus: PublishStatus.draft } });
  console.log(`set ${hidden.count} superseded placeholder products to draft`);
}

async function revert() {
  const { count } = await prisma.product.deleteMany({ where: { slug: { in: PRODUCTS.map((p) => p.slug) } } });
  const back = await prisma.product.updateMany({ where: { slug: { in: SUPERSEDED }, publishStatus: PublishStatus.draft }, data: { publishStatus: PublishStatus.published } });
  console.log(`removed ${count} accessories, republished ${back.count} placeholder products`);
}

(process.argv.includes('--revert') ? revert() : apply())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
