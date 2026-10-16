/**
 * Creates the momen. menswear range from the curated brand photography
 * (brand/curation.json → public/images/brand). Each colourway lists its
 * photos main-first; extra shots of the same colour become its gallery.
 * Also creates the categories and collections the storefront links to.
 *
 * Safe to re-run (upserts by slug). `--revert` removes the products only.
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
  { slug: 'agbada', name: 'Agbada', description: 'Complete agbada sets, embroidered by hand.', image: 'agbada-emerald-beige', sortOrder: 1 },
  { slug: 'kaftans', name: 'Kaftans', description: 'Kaftan and senator sets, clean or embroidered.', image: 'kaftan-embroidered-beige', sortOrder: 2 },
  { slug: 'jalabia', name: 'Jalabia', description: 'Full-length jalabia, everyday to ceremonial.', image: 'jalabia-ceremonial-cream-gold', sortOrder: 3 },
  { slug: 'shirts', name: 'Shirts', description: 'Mandarin and camp-collar shirts in jacquard and linen.', image: 'shirt-jacquard-forest', sortOrder: 4 },
  { slug: 'pants', name: 'Trousers', description: 'Aso-oke and ankara trousers, wide-leg, cargo and tailored.', image: 'asooke-wide-leg-indigo', sortOrder: 5 },
  { slug: 'casual-wear', name: 'Two-Piece Sets', description: 'Matching shirt-and-short or shirt-and-trouser sets.', image: 'linen-short-set-mocha', sortOrder: 6 },
];

const COLLECTIONS = [
  { slug: 'new-arrivals', name: 'New Arrivals', tag: 'New', image: 'campaign-linen-couple', sortOrder: 1, description: 'The latest pieces to leave the momen. atelier.' },
  { slug: 'signature', name: 'The momen. Signature', tag: 'Signature', image: 'hero-gold-agbada-courtyard', sortOrder: 2, description: 'The pieces that define the house.' },
  { slug: 'occasion', name: 'Occasion', tag: 'Occasion', image: 'campaign-ivory-kaftan-white-agbada', sortOrder: 3, description: 'For weddings, owambe and every room worth dressing for.' },
  { slug: 'everyday', name: 'Everyday', tag: 'Everyday', image: 'campaign-trio-grey-beige-olive', sortOrder: 4, description: 'Easy, considered pieces for every day of the week.' },
  { slug: 'heritage', name: 'Heritage', tag: 'Heritage', image: 'campaign-ivory-kaftan-chocolate-agbada', sortOrder: 5, description: 'Traditional garments, drawn with a modern hand.' },
  { slug: 'contemporary', name: 'Contemporary', tag: 'Contemporary', image: 'campaign-trio-with-ankara', sortOrder: 6, description: 'Heritage cloth in modern shapes.' },
];

interface Colour {
  name: string;
  hex: string;
  /** Main shot first, then any further shots of this colour. */
  photos: string[];
}

interface Spec {
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
}

const L = ['S', 'M', 'L', 'XL', 'XXL'];
const AG = ['M', 'L', 'XL', 'XXL', 'XXXL'];
const c = (name: string, hex: string, ...photos: string[]): Colour => ({ name, hex, photos });

const PRODUCTS: Spec[] = [
  {
    slug: 'adebayo-signature-agbada', name: 'Adebayo Signature Agbada', sku: 'MOM-M-AGB-001', category: 'agbada',
    collections: ['signature', 'occasion', 'heritage'], price: 185000, garment: Garment.agbada, sizes: AG, isSignature: true, isFeatured: true,
    short: 'Three-piece agbada with hand-embroidered chest panel.',
    description: 'The full three-piece: flowing agbada, inner kaftan and trousers, with a hand-embroidered chest panel in tonal thread. Cut generously so it moves when you do.',
    details: ['Three-piece set: agbada, inner kaftan, trousers', 'Hand-embroidered chest panel', 'Matching fila cap available', 'Made to measure on request'],
    colours: [
      c('Emerald', '#1F5B3F', 'agbada-emerald-beige', 'agbada-emerald', 'hero-emerald-agbada-courtyard'),
      c('Gold', '#B08A4A', 'agbada-gold', 'hero-gold-agbada-courtyard'),
      c('Burgundy', '#6E1F2A', 'agbada-burgundy', 'agbada-burgundy-studio'),
      c('Onyx', '#1A1A1A', 'agbada-onyx'),
      c('Navy', '#1F2B4D', 'agbada-navy'),
      c('Wine', '#5B1E28', 'agbada-wine'),
      c('Cocoa', '#5A3A28', 'agbada-cocoa'),
      c('Burnt Orange', '#C2551F', 'agbada-burnt-orange'),
      c('Olive', '#5E5A32', 'agbada-olive'),
    ],
  },
  {
    slug: 'oba-ivory-agbada', name: 'Oba Ivory Agbada', sku: 'MOM-M-AGB-002', category: 'agbada',
    collections: ['occasion', 'heritage', 'signature'], price: 210000, garment: Garment.agbada, sizes: AG, isFeatured: true,
    short: 'Ivory agbada for the wedding and the photographs after.',
    description: 'Ivory cloth carrying hand-placed embroidery in gold, onyx or tonal thread. The agbada we cut for grooms, fathers of the bride and every day that will be remembered.',
    details: ['Three-piece set: agbada, inner kaftan, trousers', 'Hand-placed embroidery', 'Made to measure on request', 'Dry clean only'],
    colours: [
      c('Ivory Gold Bloom', '#EDE2C6', 'agbada-ivory-gold-bloom'),
      c('White Tonal', '#F4F2EE', 'agbada-white-tonal'),
      c('Ivory & Gold', '#EFE6CF', 'agbada-ivory-gold'),
      c('Ivory & Onyx', '#E9E4DA', 'agbada-ivory-onyx'),
      c('Pearl', '#F2EEE4', 'agbada-pearl'),
    ],
  },
  {
    slug: 'tunde-classic-kaftan', name: 'Tunde Classic Kaftan', sku: 'MOM-M-KFT-001', category: 'kaftans',
    collections: ['everyday', 'signature'], price: 95000, garment: Garment.set, sizes: L, isSignature: true,
    short: 'Clean two-piece kaftan with a mandarin neckline.',
    description: 'A clean kaftan and trouser in a single colour — mandarin neck, concealed placket, a straight fall to the thigh. The piece you will reach for most.',
    details: ['Two-piece: kaftan and trousers', 'Mandarin neckline, concealed placket', 'Side-seam pockets', 'Made to measure on request'],
    colours: [
      c('Sand', '#D8C8AE', 'kaftan-sand', 'senator-beige'),
      c('Charcoal', '#4A4A4C', 'kaftan-charcoal', 'senator-charcoal'),
      c('White', '#F4F2EE', 'kaftan-white-pocket-square', 'senator-white', 'kaftan-white-cap'),
      c('Camel', '#C2A07A', 'kaftan-camel'),
      c('Burnt Orange', '#C2551F', 'kaftan-burnt-orange', 'kaftan-burnt-orange-grey'),
      c('Onyx', '#1A1A1A', 'kaftan-onyx-cap'),
      c('Navy', '#1F2B4D', 'kaftan-navy'),
      c('Steel Blue', '#5F7A99', 'kaftan-steel-blue'),
    ],
  },
  {
    slug: 'obinna-embroidered-kaftan', name: 'Obinna Embroidered Kaftan', sku: 'MOM-M-KFT-002', category: 'kaftans',
    collections: ['occasion', 'heritage'], price: 120000, garment: Garment.set, sizes: L, isFeatured: true,
    short: 'Kaftan with tonal hand embroidery at the chest.',
    description: 'Our classic kaftan, finished with tonal embroidery placed by hand across the chest. Quiet from a distance, extraordinary up close.',
    details: ['Two-piece: kaftan and trousers', 'Tonal hand embroidery', 'Mandarin neckline', 'Made to measure on request'],
    colours: [
      c('Beige', '#CBB79A', 'kaftan-embroidered-beige'),
      c('Forest', '#1F4A33', 'kaftan-embroidered-forest'),
      c('Midnight', '#1C2340', 'kaftan-embroidered-midnight'),
      c('Onyx', '#1A1A1A', 'kaftan-embroidered-onyx'),
      c('Taupe', '#8C7B68', 'kaftan-embroidered-taupe'),
      c('Cocoa', '#4E3527', 'kaftan-embroidered-cocoa'),
    ],
  },
  {
    slug: 'dayo-geometric-panel-kaftan', name: 'Dayo Geometric Panel Kaftan', sku: 'MOM-M-KFT-003', category: 'kaftans',
    collections: ['contemporary', 'new-arrivals'], price: 110000, garment: Garment.set, sizes: L, isNew: true, isFeatured: true,
    short: 'Kaftan with a geometric print panel and cuffs.',
    description: 'A clean kaftan broken by a single geometric print panel down the chest and at the cuffs — heritage pattern, placed with restraint.',
    details: ['Two-piece: kaftan and trousers', 'Geometric print panel and cuffs', 'Mandarin neckline', 'Made to measure on request'],
    colours: [c('White', '#F4F2EE', 'kaftan-geometric-white'), c('Onyx', '#1A1A1A', 'kaftan-geometric-onyx')],
  },
  {
    slug: 'yusuf-classic-jalabia', name: 'Yusuf Classic Jalabia', sku: 'MOM-M-JLB-001', category: 'jalabia',
    collections: ['everyday', 'heritage'], price: 90000, garment: Garment.top, sizes: L, isNew: true,
    short: 'Full-length jalabia with tonal embroidery at the neck.',
    description: 'A full-length jalabia with a round neck and tonal embroidery, cut to fall clean to the ankle. Easy for Friday, right for the occasion.',
    details: ['Full length', 'Tonal embroidery at the neck and placket', 'Side pockets', 'Matching cap available'],
    colours: [
      c('Ivory', '#EFE8DA', 'jalabia-ivory'),
      c('Emerald', '#1F5B3F', 'jalabia-emerald'),
      c('Midnight', '#1C2340', 'jalabia-midnight'),
      c('Chocolate', '#4E3527', 'jalabia-chocolate'),
      c('Onyx', '#1A1A1A', 'jalabia-onyx'),
    ],
  },
  {
    slug: 'alhaji-ceremonial-jalabia', name: 'Alhaji Ceremonial Jalabia', sku: 'MOM-M-JLB-002', category: 'jalabia',
    collections: ['occasion', 'heritage'], price: 140000, garment: Garment.top, sizes: L, isFeatured: true,
    short: 'Cream jalabia with gold embroidery for ceremonies.',
    description: 'Cream cloth with gold embroidery worked down the chest and around the neck — the jalabia for weddings, Eid and the days that ask for more.',
    details: ['Full length', 'Gold hand embroidery', 'Matching cap included', 'Dry clean only'],
    colours: [c('Cream & Gold', '#EFE3C8', 'jalabia-ceremonial-cream-gold')],
  },
  {
    slug: 'kola-jacquard-mandarin-shirt', name: 'Kola Jacquard Mandarin Shirt', sku: 'MOM-M-SHT-001', category: 'shirts',
    collections: ['contemporary', 'new-arrivals'], price: 55000, garment: Garment.top, sizes: L, isNew: true,
    short: 'Textured jacquard shirt with a mandarin collar.',
    description: 'A long-sleeve mandarin-collar shirt in a woven jacquard that catches the light. Wear it buttoned with wide trousers, or open over a tee.',
    details: ['Mandarin collar', 'Woven jacquard', 'Relaxed fit', 'Pairs with our wide trousers'],
    colours: [c('Forest', '#1F4A33', 'shirt-jacquard-forest'), c('Rust', '#B4522A', 'shirt-jacquard-rust'), c('Cobalt', '#1F3A8A', 'shirt-jacquard-cobalt')],
  },
  {
    slug: 'tobi-linen-mandarin-shirt', name: 'Tobi Linen Mandarin Shirt', sku: 'MOM-M-SHT-002', category: 'shirts',
    collections: ['everyday'], price: 48000, garment: Garment.top, sizes: L,
    short: 'Breathable linen shirt with a mandarin collar.',
    description: 'Pure linen, a mandarin collar and a relaxed cut — built for heat, made to look considered in it.',
    details: ['100% linen', 'Mandarin collar', 'Relaxed fit', 'Machine wash cold'],
    colours: [c('Sage', '#A7B79A', 'shirt-linen-sage'), c('Sky', '#A9C6E8', 'shirt-linen-sky'), c('Blush', '#E8B9BF', 'shirt-linen-blush'), c('Stone', '#D9CFBE', 'shirt-linen-stone')],
  },
  {
    slug: 'femi-camp-collar-linen-shirt', name: 'Femi Camp-Collar Linen Shirt', sku: 'MOM-M-SHT-003', category: 'shirts',
    collections: ['everyday', 'new-arrivals'], price: 42000, garment: Garment.top, sizes: L, isNew: true,
    short: 'Short-sleeve camp-collar shirt in washed linen.',
    description: 'A short-sleeve camp-collar shirt in washed linen with a single chest pocket. Shown with our trousers and shorts — it goes with all of them.',
    details: ['Washed linen', 'Camp collar, chest pocket', 'Relaxed, slightly cropped fit', 'Machine wash cold'],
    colours: [
      c('Rose', '#C98F8C', 'linen-shirt-rose-charcoal-trousers', 'linen-shirt-rose-navy-shorts'),
      c('Ivory', '#EFE8DA', 'linen-shirt-ivory-mocha-trousers', 'linen-shirt-ivory-navy-shorts'),
      c('Midnight', '#1F2B4D', 'linen-shirt-midnight-sand-trousers', 'linen-shirt-midnight-ivory-shorts'),
      c('Sage', '#A7B79A', 'linen-shirt-sage-ivory-trousers'),
      c('Sand', '#D9C9A8', 'linen-shirt-sand-navy-shorts'),
      c('Terracotta', '#B4522A', 'linen-shirt-terracotta-ivory-trousers'),
    ],
  },
  {
    slug: 'lekki-short-two-piece', name: 'Lekki Short Two-Piece', sku: 'MOM-M-SET-001', category: 'casual-wear',
    collections: ['everyday', 'new-arrivals'], price: 65000, garment: Garment.set, sizes: L, isNew: true, isFeatured: true,
    short: 'Short-sleeve shirt and matching short in linen.',
    description: 'A short-sleeve shirt and matching short in breathable linen, some finished with a woven trim at the pocket and cuff. Made for long Lagos afternoons.',
    details: ['Two-piece: shirt and short', 'Breathable linen', 'Woven trim on selected colours', 'Machine wash cold'],
    colours: [
      c('Sage', '#A7B79A', 'linen-short-set-sage'),
      c('Mocha', '#8A6A50', 'linen-short-set-mocha'),
      c('Midnight', '#1F2B4D', 'linen-short-set-midnight', 'twopiece-short-midnight'),
      c('Rose', '#C98F8C', 'linen-short-set-rose'),
      c('Forest', '#1F4A33', 'twopiece-short-forest'),
      c('Olive', '#6B6A3A', 'twopiece-short-olive'),
      c('Teal', '#1F6F6B', 'twopiece-short-teal'),
      c('Onyx', '#1A1A1A', 'twopiece-short-onyx'),
      c('White', '#F4F2EE', 'twopiece-short-white'),
      c('Navy Trim', '#26355E', 'twopiece-short-navy-trim'),
      c('Mint', '#A8D5C2', 'twopiece-short-mint'),
      c('Sand', '#D9C9A8', 'twopiece-short-sand'),
      c('Wine', '#6B1F2E', 'twopiece-short-wine'),
      c('Scarlet', '#B3262A', 'twopiece-short-scarlet'),
      c('Cream', '#EDE3CF', 'twopiece-short-cream'),
      c('Blush', '#E8B9BF', 'twopiece-short-blush'),
      c('Cocoa', '#5A3A28', 'twopiece-short-cocoa'),
      c('Sky', '#A9C6E8', 'twopiece-short-sky'),
    ],
  },
  {
    slug: 'victoria-island-camp-collar-set', name: 'Victoria Island Camp-Collar Set', sku: 'MOM-M-SET-003', category: 'casual-wear',
    collections: ['everyday', 'new-arrivals'], price: 72000, garment: Garment.set, sizes: L, isNew: true, isFeatured: true,
    short: 'Camp-collar shirt and tapered trouser in one colour.',
    description: 'A short-sleeve camp-collar shirt with a matching tapered trouser — dressed enough for dinner, easy enough for the drive there.',
    details: ['Two-piece: shirt and trousers', 'Camp collar', 'Tapered trouser with side pockets', 'Machine wash cold'],
    colours: [
      c('Ivory', '#EFE8DA', 'camp-collar-set-ivory', 'camp-collar-set-ivory-alt'),
      c('Mocha', '#8A6A50', 'camp-collar-set-mocha'),
      c('Olive', '#6B6A3A', 'camp-collar-set-olive', 'camp-collar-set-olive-alt'),
      c('Midnight', '#1F2B4D', 'camp-collar-set-midnight'),
      c('Rose', '#C98F8C', 'camp-collar-set-rose'),
      c('Onyx', '#1A1A1A', 'camp-collar-set-onyx'),
      c('Mint', '#BFD6C2', 'camp-collar-set-mint'),
    ],
  },
  {
    slug: 'ikoyi-long-two-piece', name: 'Ikoyi Long Two-Piece', sku: 'MOM-M-SET-002', category: 'casual-wear',
    collections: ['everyday', 'contemporary'], price: 78000, garment: Garment.set, sizes: L,
    short: 'Long-sleeve shirt and wide trouser, one colour.',
    description: 'A mandarin-collar long-sleeve shirt and an easy wide-leg trouser in the same cloth. One decision, dressed.',
    details: ['Two-piece: shirt and trousers', 'Mandarin collar', 'Wide-leg trouser with pleat', 'Made to measure on request'],
    colours: [
      c('White & Stone', '#F1EDE4', 'twopiece-long-white-stone'),
      c('Onyx', '#1A1A1A', 'twopiece-long-onyx'),
      c('Cocoa', '#5A3A28', 'twopiece-long-cocoa'),
      c('Olive', '#6B6A3A', 'twopiece-long-olive'),
      c('Midnight', '#15161A', 'twopiece-long-midnight'),
    ],
  },
  {
    slug: 'kunle-aso-oke-two-piece', name: 'Kunle Aso-Oke Two-Piece', sku: 'MOM-M-SET-004', category: 'casual-wear',
    collections: ['contemporary', 'heritage'], price: 120000, garment: Garment.set, sizes: L, isNew: true,
    short: 'Matching aso-oke shirt and wide trouser.',
    description: 'Hand-woven aso-oke cut into a short-sleeve shirt and a wide trouser, the stripe running long. Heritage cloth, worn head to toe.',
    details: ['Two-piece: shirt and trousers', 'Hand-woven aso-oke', 'Wide-leg trouser', 'Dry clean recommended'],
    colours: [c('Warm Stripe', '#9C7A55', 'asooke-two-piece-warm-stripe')],
  },
  {
    slug: 'seun-aso-oke-wide-leg-trouser', name: 'Seun Aso-Oke Wide-Leg Trouser', sku: 'MOM-M-TRS-003', category: 'pants',
    collections: ['contemporary', 'heritage', 'new-arrivals'], price: 62000, garment: Garment.trouser, sizes: L, isNew: true, isFeatured: true,
    short: 'Wide-leg trouser in striped hand-woven aso-oke.',
    description: 'Hand-woven aso-oke, cut into a high, easy wide-leg trouser with a drawstring waist. Pair it with a plain tee and let the cloth speak.',
    details: ['Hand-woven aso-oke', 'Wide leg, full length', 'Drawstring waist', 'Dry clean recommended'],
    colours: [
      c('Indigo', '#26355E', 'asooke-wide-leg-indigo'),
      c('Natural', '#CDB894', 'asooke-wide-leg-natural'),
      c('Burgundy', '#6B1F2E', 'asooke-wide-leg-burgundy'),
      c('Forest', '#2E5A3A', 'asooke-wide-leg-forest'),
      c('Charcoal', '#4A4A4C', 'asooke-wide-leg-charcoal'),
      c('Cocoa', '#5A3A28', 'asooke-wide-leg-cocoa'),
      c('Terracotta', '#A04A2C', 'asooke-wide-leg-terracotta'),
    ],
  },
  {
    slug: 'ola-aso-oke-cargo-trouser', name: 'Ola Aso-Oke Cargo Trouser', sku: 'MOM-M-TRS-001', category: 'pants',
    collections: ['contemporary', 'heritage'], price: 68000, garment: Garment.trouser, sizes: L, isNew: true,
    short: 'Wide cargo trouser in striped aso-oke.',
    description: 'Hand-woven aso-oke, cut into a wide cargo trouser with deep patch pockets and a drawstring waist. Heritage cloth, worn like you mean it.',
    details: ['Hand-woven aso-oke', 'Wide leg with cargo pockets', 'Drawstring waist', 'Dry clean recommended'],
    colours: [
      c('Onyx & Gold', '#2A241A', 'asooke-cargo-onyx-gold'),
      c('Forest & Onyx', '#1F3A2A', 'asooke-cargo-forest-onyx'),
      c('Burgundy Stripe', '#6B1F2E', 'asooke-cargo-burgundy-stripe'),
      c('Rust Stripe', '#A04A2C', 'asooke-cargo-rust-stripe'),
      c('Green Stripe', '#2E5A3A', 'asooke-cargo-green-stripe'),
      c('Olive Stripe', '#7A6A2E', 'asooke-cargo-olive-stripe'),
      c('Grey Stripe', '#6B6B6B', 'asooke-cargo-grey-stripe'),
    ],
  },
  {
    slug: 'bola-ankara-cargo-trouser', name: 'Bola Ankara Cargo Trouser', sku: 'MOM-M-TRS-002', category: 'pants',
    collections: ['contemporary', 'new-arrivals'], price: 58000, garment: Garment.trouser, sizes: L, isNew: true,
    short: 'Relaxed cargo trouser in bold ankara print.',
    description: 'A relaxed, wide cargo trouser in ankara wax print with a drawstring waist. Pair it with a plain tee and let the cloth talk.',
    details: ['100% cotton wax print', 'Wide leg with cargo pockets', 'Drawstring waist', 'Machine wash cold, inside out'],
    colours: [
      c('Teal Geo', '#1F6F6B', 'ankara-cargo-teal'),
      c('Cocoa Geo', '#7A5232', 'ankara-cargo-cocoa'),
      c('Burgundy & Tan', '#7A2E34', 'ankara-cargo-burgundy-tan'),
      c('Navy & Rust', '#26355E', 'ankara-cargo-navy'),
      c('Olive Geo', '#6B6A3A', 'ankara-cargo-olive'),
      c('Kente', '#C98A2B', 'ankara-cargo-kente'),
      c('Kente Gold', '#B5651D', 'ankara-cargo-kente-gold'),
      c('Monochrome', '#2A2A2A', 'ankara-cargo-monochrome'),
      c('Onyx Geo', '#1A1A1A', 'ankara-cargo-onyx-geo'),
      c('Grey Geo', '#8A8A8A', 'ankara-cargo-grey-geo'),
      c('Burgundy Geo', '#6B1F2E', 'ankara-cargo-burgundy-geo'),
      c('Green Sun', '#2E7A3A', 'ankara-cargo-green-sun'),
      c('Orange Geo', '#D9732B', 'ankara-cargo-orange-geo'),
    ],
  },
  {
    slug: 'remi-ankara-tailored-trouser', name: 'Remi Ankara Tailored Trouser', sku: 'MOM-M-TRS-004', category: 'pants',
    collections: ['contemporary', 'new-arrivals'], price: 52000, garment: Garment.trouser, sizes: L, isNew: true,
    short: 'Straight tailored trouser in ankara wax print.',
    description: 'A straight, pressed trouser in ankara wax print — tailored enough for a shirt and loafers, bold enough to wear with a plain tee.',
    details: ['100% cotton wax print', 'Straight leg, pressed crease', 'Belt loops and side pockets', 'Machine wash cold, inside out'],
    colours: [
      c('Emerald & Gold', '#2E6B3A', 'ankara-tailored-trouser-emerald-gold'),
      c('Navy & Amber', '#26355E', 'ankara-tailored-trouser-navy'),
      c('Teal', '#1F6F6B', 'ankara-tailored-trouser-teal'),
    ],
  },
];

async function upsertProduct(p: Spec, categoryIds: Record<string, string>, collectionIds: Record<string, string>, sizeOptions: { id: string; label: string }[], tags: { id: string; name: string }[]) {
  // Gallery: every colour's main shot first, then the extra shots.
  const mains = p.colours.map((col) => img(col.photos[0]));
  const extras = p.colours.flatMap((col) => col.photos.slice(1).map(img));
  const images = [...mains, ...extras];
  const first = p.colours[0];
  const hover = first.photos[1] ? img(first.photos[1]) : mains[1] ?? null;
  const data = {
    name: p.name, sku: p.sku, categoryId: categoryIds[p.category], price: p.price, images, hoverImage: hover,
    productionType: 'ready_to_wear' as const, productType: 'ready_to_wear' as const, gender: 'men' as const,
    sizingMode: 'standard' as const, garment: p.garment, description: p.description, shortDescription: p.short,
    details: p.details, careInstructions: ['Dry clean or hand wash cold', 'Do not bleach', 'Iron on the reverse'],
    productionDaysStandardMin: 3, productionDaysStandardMax: 5, productionDaysExpressMin: 1, productionDaysExpressMax: 2,
    isNew: p.isNew ?? false, isFeatured: p.isFeatured ?? false, isSignature: p.isSignature ?? false,
    stockQuantity: 24, lowStockThreshold: 3, publishStatus: PublishStatus.published,
  };
  const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
  const product = existing
    ? await prisma.product.update({ where: { slug: p.slug }, data })
    : await prisma.product.create({ data: { slug: p.slug, ...data } });

  await prisma.productColorVariant.deleteMany({ where: { productId: product.id } });
  await prisma.productColorVariant.createMany({
    data: p.colours.map((col, i) => ({ productId: product.id, name: col.name, hex: col.hex, sortOrder: i, images: col.photos.map(img) })),
  });
  await prisma.productSize.deleteMany({ where: { productId: product.id } });
  await prisma.productSize.createMany({
    data: p.sizes.map((label, i) => ({ productId: product.id, label, sortOrder: i, sizeOptionId: sizeOptions.find((o) => o.label === label)?.id })),
  });
  await prisma.productCollection.deleteMany({ where: { productId: product.id } });
  await prisma.productCollection.createMany({ data: p.collections.map((slug) => ({ productId: product.id, collectionId: collectionIds[slug] })) });
  await prisma.productTag.deleteMany({ where: { productId: product.id } });
  await prisma.productTag.createMany({ data: tags.filter((t) => t.name !== 'New' || p.isNew).map((t) => ({ productId: product.id, tagId: t.id })) });
  return { existing: Boolean(existing), photos: images.length };
}

async function apply() {
  const categoryIds: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { slug: cat.slug, name: cat.name, description: cat.description, image: img(cat.image), sortOrder: cat.sortOrder, publishStatus: PublishStatus.published },
      update: { image: img(cat.image), publishStatus: PublishStatus.published },
    });
    categoryIds[cat.slug] = row.id;
  }
  const collectionIds: Record<string, string> = {};
  for (const col of COLLECTIONS) {
    const row = await prisma.collection.upsert({
      where: { slug: col.slug },
      create: { slug: col.slug, name: col.name, description: col.description, tag: col.tag, image: img(col.image), sortOrder: col.sortOrder, publishStatus: PublishStatus.published },
      update: { image: img(col.image), publishStatus: PublishStatus.published },
    });
    collectionIds[col.slug] = row.id;
  }
  const sizeOptions = await prisma.sizeOption.findMany();
  const tags = await Promise.all(['Menswear', 'Ready-to-Wear', 'New'].map((name) => prisma.tag.upsert({ where: { name }, create: { name }, update: {} })));
  for (const p of PRODUCTS) {
    const r = await upsertProduct(p, categoryIds, collectionIds, sizeOptions, tags);
    console.log(`${r.existing ? 'updated' : 'created'} ${p.slug} (${p.colours.length} colours, ${r.photos} photos)`);
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
