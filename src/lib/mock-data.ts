import {
  Category,
  Collection,
  ColorSwatch,
  CustomizationGroup,
  Fabric,
  Gender,
  MeasurementFieldDef,
  Product,
  ProductType,
  ProductionSettings,
  SizeOption,
  SizingMode,
} from "./types";

// Demo imagery: real brand outfit photos, picked deterministically per seed.
const DEMO_LOOKS = ["agbada-onyx", "kaftan-embroidered-beige", "jalabia-ivory", "campaign-trio-onyx-beige-white", "linen-short-set-sage", "shirt-linen-sage", "asooke-wide-leg-indigo", "agbada-emerald", "kaftan-geometric-white", "camp-collar-set-ivory"];
const img = (seed: string, _w?: number, _h?: number) => {
  void _w;
  void _h;
  const hash = [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return `/images/brand/${DEMO_LOOKS[hash % DEMO_LOOKS.length]}.jpg`;
};

/* ───────────────────────────── Collections ───────────────────────────── */

const rawCollections: Omit<Collection, "id" | "publishStatus" | "expressEligible" | "sortOrder" | "seo">[] = [
  {
    slug: "new-arrivals",
    name: "New Arrivals",
    description: "The latest silhouettes to enter the Momen atelier, cut for the season ahead.",
    image: img("momen-new-arrivals", 1600, 1000),
    tag: "New",
  },
  {
    slug: "signature",
    name: "The Momen Signature",
    description: "Distinctive silhouettes, refined fabrics — the pieces that define Momen.",
    image: img("momen-signature-men", 1600, 1000),
    tag: "Signature",
  },
  {
    slug: "occasion",
    name: "Occasion",
    description: "For weddings, ceremonies, and the moments that call for something considered.",
    image: img("momen-occasion-men", 1600, 1000),
  },
  {
    slug: "everyday",
    name: "Everyday",
    description: "Quietly premium foundations, built for daily wear without compromise.",
    image: img("momen-everyday-men", 1600, 1000),
  },
  {
    slug: "heritage",
    name: "Heritage",
    description: "Traditional silhouettes rendered with contemporary precision — Agbada, Senator, Kaftan, Jalabia.",
    image: img("momen-heritage", 1600, 1000),
    tag: "Heritage",
  },
  {
    slug: "contemporary",
    name: "Contemporary",
    description: "Modern African tailoring for the man who moves between worlds.",
    image: img("momen-contemporary", 1600, 1000),
  },
  {
    slug: "limited-edition",
    name: "Limited Edition",
    description: "Small-batch fabrics and finishes. Once sold, retired for good.",
    image: img("momen-limited-men", 1600, 1000),
    tag: "Limited",
  },
];

/* ───────────────────────────── Categories ───────────────────────────── */

const rawCategories: { slug: string; name: string; description: string; parentSlug?: string }[] = [
  { slug: "kaftans", name: "Kaftans", description: "Classic, embroidered, and occasion kaftans, tailored or made-to-measure." },
  { slug: "senator", name: "Senator Wear", description: "Tops, trousers, and complete Senator sets — Momen's most-worn silhouette." },
  { slug: "agbada", name: "Agbada", description: "Complete Agbada sets with inner Senator, embroidered and occasion pieces." },
  { slug: "jalabia", name: "Jalabia", description: "Traditional and contemporary Jalabia, embroidered and premium occasion." },
  { slug: "shirts", name: "Shirts", description: "Native, formal, casual, linen, Ankara, and resort shirts." },
  { slug: "pants", name: "Pants", description: "Senator trousers, tailored pants, linen, Ankara, and Aso-Oke trousers." },
  { slug: "casual-wear", name: "Casual Wear", description: "T-shirts, polos, shorts, and relaxed weekend pieces." },
  { slug: "accessories", name: "Accessories", description: "Footwear and accessories to complete a Momen look." },
  { slug: "footwear", name: "Footwear", description: "Pam sandals, leather sandals, and traditional sandals.", parentSlug: "accessories" },
  { slug: "belts", name: "Belts", description: "Full-grain leather belts.", parentSlug: "accessories" },
  { slug: "bags", name: "Bags", description: "Structured leather bags.", parentSlug: "accessories" },
  { slug: "caps", name: "Caps", description: "Woven and Aso-Oke caps (fila).", parentSlug: "accessories" },
  { slug: "other-accessories", name: "Other Accessories", description: "Wallets, bracelets, cufflinks, pocket squares, and ties.", parentSlug: "accessories" },
];

/* ───────────────────────────── Fabric library ───────────────────────────── */

export const fabrics: Fabric[] = [
  { id: "fab-premium-cotton", name: "Premium Long-Staple Cotton", category: "Cotton", image: img("fabric-cotton", 800, 800), description: "Breathable, soft-handle cotton with a subtle sheen. Our house-standard fabric.", additionalCost: 0, available: true, sortOrder: 0 },
  { id: "fab-linen", name: "European Linen", category: "Linen", image: img("fabric-linen", 800, 800), description: "Lightweight and textured — built for warm-weather comfort.", additionalCost: 8000, available: true, sortOrder: 1 },
  { id: "fab-senator-classic", name: "Senator Fabric — Classic", category: "Senator", image: img("fabric-senator-classic", 800, 800), description: "Structured, matte-finish fabric with clean drape — the traditional Senator cloth.", additionalCost: 0, available: true, sortOrder: 2 },
  { id: "fab-senator-premium", name: "Senator Fabric — Premium", category: "Senator", image: img("fabric-senator-premium", 800, 800), description: "A heavier, finer weave of Senator cloth with a subtle woven texture.", additionalCost: 15000, available: true, sortOrder: 3 },
  { id: "fab-wool-blend", name: "Merino Wool Blend", category: "Wool", image: img("fabric-wool", 800, 800), description: "Structured and season-spanning, with a refined natural stretch.", additionalCost: 22000, available: true, sortOrder: 4 },
  { id: "fab-cashmere-blend", name: "Cashmere-Wool Blend", category: "Wool", image: img("fabric-cashmere", 800, 800), description: "Exceptionally soft with a luxurious weight — reserved for signature pieces.", additionalCost: 45000, available: true, sortOrder: 5 },
  { id: "fab-ankara", name: "Ankara Print", category: "Ankara", image: img("fabric-ankara", 800, 800), description: "Vibrant wax-print cotton in bold, graphic patterns.", additionalCost: 6000, available: true, sortOrder: 6 },
  { id: "fab-aso-oke", name: "Aso-Oke Handwoven", category: "Aso-Oke", image: img("fabric-asooke", 800, 800), description: "Hand-loomed on traditional looms — every metre is one of a kind.", additionalCost: 35000, available: true, sortOrder: 7 },
  { id: "fab-guinea-brocade", name: "Guinea Brocade", category: "Other", image: img("fabric-guinea", 800, 800), description: "Dense, richly textured brocade favoured for occasion Agbada and Kaftan.", additionalCost: 28000, available: true, sortOrder: 8 },
  { id: "fab-silk-cotton", name: "Silk-Cotton Blend", category: "Other", image: img("fabric-silkcotton", 800, 800), description: "A soft matte lustre with cotton's ease of wear.", additionalCost: 18000, available: true, sortOrder: 9 },
  { id: "fab-george", name: "George Fabric", category: "Other", image: img("fabric-george", 800, 800), description: "Richly embellished, often finished with hand-stitched edging — occasion-grade.", additionalCost: 32000, available: true, sortOrder: 10 },
];

/* ───────────────────────────── Colour library ───────────────────────────── */

export const colorSwatches: ColorSwatch[] = [
  { id: "col-ink", name: "Ink Black", hex: "#15130F", sortOrder: 0 },
  { id: "col-ivory", name: "Ivory", hex: "#F1ECDD", sortOrder: 1 },
  { id: "col-cream", name: "Cream", hex: "#EFE6D2", sortOrder: 2 },
  { id: "col-charcoal", name: "Charcoal", hex: "#2E2B25", sortOrder: 3 },
  { id: "col-deep-brown", name: "Deep Brown", hex: "#4A3524", sortOrder: 4 },
  { id: "col-sand", name: "Sand", hex: "#C9B79A", sortOrder: 5 },
  { id: "col-taupe", name: "Taupe", hex: "#8A7B68", sortOrder: 6 },
  { id: "col-olive", name: "Olive", hex: "#5C5B41", sortOrder: 7 },
  { id: "col-navy", name: "Deep Navy", hex: "#1B2233", sortOrder: 8 },
  { id: "col-burgundy", name: "Burgundy", hex: "#5B2230", sortOrder: 9 },
  { id: "col-bronze", name: "Bronze", hex: "#A3803E", sortOrder: 10 },
  { id: "col-terracotta", name: "Terracotta", hex: "#A3603E", sortOrder: 11 },
  { id: "col-stone", name: "Stone", hex: "#B7AC98", sortOrder: 12 },
  { id: "col-rust", name: "Rust", hex: "#8A4A2E", sortOrder: 13 },
];

/** Canonical letter-size run (Section 13) — products reference these by
 * label via a checklist in the admin Product editor. Garments that don't use
 * the standard run (shoe sizes, numeric waists, "One Size") still enter
 * sizes as free text on the product itself, so this list only needs to cover
 * the shared run, not every possible size a product could carry. */
export const sizeOptions: SizeOption[] = [
  { id: "size-xs", label: "XS", sortOrder: 0, active: true },
  { id: "size-s", label: "S", sortOrder: 1, active: true },
  { id: "size-m", label: "M", sortOrder: 2, active: true },
  { id: "size-l", label: "L", sortOrder: 3, active: true },
  { id: "size-xl", label: "XL", sortOrder: 4, active: true },
  { id: "size-xxl", label: "XXL", sortOrder: 5, active: true },
  { id: "size-xxxl", label: "XXXL", sortOrder: 6, active: true },
];

function colorsFor(...names: string[]) {
  return names.map((n) => {
    const swatch = colorSwatches.find((c) => c.name === n);
    if (!swatch) throw new Error(`colorsFor(): unknown colour swatch "${n}" — check it exists in colorSwatches.`);
    return { name: swatch.name, hex: swatch.hex };
  });
}

/* ───────────────────────────── Customization library ───────────────────────────── */

// Colour and fabric are NOT modeled as customization groups here — they have
// their own dedicated, centrally-managed libraries (`colorSwatches`, admin
// Colours; `fabrics`, admin Fabrics) that the customization wizard reads
// directly, so a colour or fabric is only ever defined in one place (Section
// 12). `customizationGroups` is reserved for style-level choices (sleeve,
// collar, embroidery, monogram, etc.) that admins manage from Customization
// Options without touching code.
export const customizationGroups: CustomizationGroup[] = [
  {
    id: "sleeve-style",
    name: "Sleeve Style",
    description: "How the sleeve is finished.",
    choices: [
      { id: "sleeve-long", label: "Long Sleeve", additionalCost: 0, available: true, sortOrder: 0 },
      { id: "sleeve-short", label: "Short Sleeve", additionalCost: 0, available: true, sortOrder: 1 },
      { id: "sleeve-three-quarter", label: "Three-Quarter Sleeve", additionalCost: 3000, available: true, sortOrder: 2 },
    ],
  },
  {
    id: "collar",
    name: "Collar / Neckline",
    description: "Collar or neckline finish.",
    choices: [
      { id: "collar-classic", label: "Classic Collar", additionalCost: 0, available: true, sortOrder: 0 },
      { id: "collar-mandarin", label: "Mandarin Collar", additionalCost: 4000, available: true, sortOrder: 1 },
      { id: "collar-open", label: "Open Neckline", additionalCost: 0, available: true, sortOrder: 2 },
      { id: "collar-round", label: "Round Neck", additionalCost: 0, available: true, sortOrder: 3 },
    ],
  },
  {
    id: "trouser-style",
    name: "Trouser Style",
    description: "Leg silhouette.",
    choices: [
      { id: "trouser-straight", label: "Straight Leg", additionalCost: 0, available: true, sortOrder: 0 },
      { id: "trouser-tapered", label: "Tapered", additionalCost: 0, available: true, sortOrder: 1 },
      { id: "trouser-wide", label: "Wide Leg", additionalCost: 3500, available: true, sortOrder: 2 },
    ],
  },
  {
    id: "embroidery",
    name: "Embroidery",
    description: "Hand or machine embroidery detailing.",
    choices: [
      { id: "embroidery-none", label: "None", additionalCost: 0, available: true, sortOrder: 0 },
      { id: "embroidery-chest", label: "Chest Detailing", additionalCost: 12000, available: true, sortOrder: 1 },
      { id: "embroidery-cuff", label: "Cuff Detailing", additionalCost: 8000, available: true, sortOrder: 2 },
      { id: "embroidery-full", label: "Full Embroidered Panel", additionalCost: 25000, available: true, sortOrder: 3 },
    ],
  },
  {
    id: "monogram",
    name: "Monogram",
    description: "Personal initials, discreetly placed.",
    choices: [
      { id: "monogram-none", label: "None", additionalCost: 0, available: true, sortOrder: 0 },
      { id: "monogram-add", label: "Add Monogram (up to 3 letters)", additionalCost: 6000, available: true, sortOrder: 1 },
    ],
  },
];

function defaultCustomizationForGarment(garment: Product["garment"], customizable: boolean) {
  if (garment === "accessory") return [];
  const groups =
    garment === "trouser"
      ? ["trouser-style", "monogram"]
      : garment === "agbada"
      ? ["embroidery", "monogram"]
      : garment === "set"
      ? ["sleeve-style", "collar", "trouser-style", "embroidery", "monogram"]
      : ["sleeve-style", "collar", "embroidery", "monogram"];
  return groups.map((groupId, idx) => ({ groupId, enabled: customizable && idx < (garment === "set" ? 3 : 2), required: false }));
}

/* ───────────────────────────── Products ───────────────────────────── */

const standardTop = { standard: [7, 14] as [number, number], express: [3, 5] as [number, number] };
const standardTrouser = { standard: [6, 12] as [number, number], express: [3, 5] as [number, number] };
const heritageSet = { standard: [10, 18] as [number, number], express: [5, 8] as [number, number] };
const agbadaTimeline = { standard: [14, 21] as [number, number], express: [7, 10] as [number, number] };
const accessoryTimeline = { standard: [2, 4] as [number, number], express: [1, 2] as [number, number] };

type RawProduct = Omit<
  Product,
  | "sku"
  | "tags"
  | "stockQuantity"
  | "lowStockThreshold"
  | "publishStatus"
  | "expressEligible"
  | "customization"
  | "seo"
  | "createdAt"
  | "updatedAt"
  | "productType"
  | "sizingMode"
  | "customizable"
  | "referenceImagesAllowed"
  | "specialInstructionsAllowed"
  | "gender"
> & {
  gender?: Gender;
  customizable?: boolean;
  sizingMode?: SizingMode;
};

const rawProducts: RawProduct[] = [
  /* ── Kaftans ─────────────────────────────────────────────────────────── */
  {
    id: "p-kaftan-1", slug: "amadi-classic-kaftan", name: "Amadi Classic Kaftan", category: "Kaftans",
    collectionSlugs: ["signature", "heritage"], price: 92000, currency: "NGN",
    images: [img("momen-kaftan1-a"), img("momen-kaftan1-b"), img("momen-kaftan1-c")], hoverImage: img("momen-kaftan1-b"),
    colors: colorsFor("Ink Black", "Ivory", "Deep Brown", "Bronze"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Premium long-staple cotton, garment-washed for a soft, considered drape.",
    fabricIds: ["fab-premium-cotton", "fab-linen", "fab-silk-cotton"],
    description: "The kaftan Momen was built on — clean lines, a considered drape, and a fit that holds its shape from morning meetings to evening prayers. Cut precisely to your measurements.",
    shortDescription: "A clean, considered kaftan cut to your measurements.",
    details: ["Side seam pockets", "Reinforced neckline", "Made in Lagos"], careInstructions: ["Machine wash cold", "Hang dry", "Warm iron if needed"],
    productionDays: standardTop, isFeatured: true, isSignature: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps", "other-accessories"],
  },
  {
    id: "p-kaftan-2", slug: "obasi-embroidered-kaftan", name: "Obasi Embroidered Kaftan", category: "Kaftans",
    collectionSlugs: ["occasion", "heritage"], price: 138000, currency: "NGN",
    images: [img("momen-kaftan2-a"), img("momen-kaftan2-b"), img("momen-kaftan2-c")], hoverImage: img("momen-kaftan2-b"),
    colors: colorsFor("Ink Black", "Deep Navy", "Burgundy"), sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Guinea brocade with hand-finished chest embroidery.",
    fabricIds: ["fab-guinea-brocade", "fab-senator-premium"],
    description: "Hand embroidery across the chest, finished on a heavier brocade cloth. Built for the occasions worth dressing for — weddings, ceremonies, Eid.",
    shortDescription: "Hand-embroidered brocade kaftan for occasion wear.",
    details: ["Hand-finished embroidery", "Concealed button placket", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: heritageSet, isFeatured: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps", "other-accessories"],
  },
  {
    id: "p-kaftan-3", slug: "dele-premium-occasion-kaftan", name: "Dele Premium Occasion Kaftan", category: "Kaftans",
    collectionSlugs: ["occasion", "limited-edition"], price: 165000, currency: "NGN",
    images: [img("momen-kaftan3-a"), img("momen-kaftan3-b")], hoverImage: img("momen-kaftan3-b"),
    colors: colorsFor("Ivory", "Bronze"), sizes: ["M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Hand-loomed Aso-Oke panels set into a Guinea brocade body.",
    fabricIds: ["fab-aso-oke", "fab-guinea-brocade"],
    description: "A small-batch occasion kaftan pairing hand-loomed Aso-Oke against brocade. Once this season's fabric run sells out, it's retired.",
    shortDescription: "Small-batch Aso-Oke occasion kaftan.",
    details: ["Aso-Oke chest panel", "Limited fabric run", "Made in Lagos"], careInstructions: ["Dry clean only", "Store on a padded hanger"],
    productionDays: heritageSet, isFeatured: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps"],
  },
  {
    id: "p-kaftan-4", slug: "tunde-minimal-kaftan", name: "Tunde Minimal Kaftan", category: "Kaftans",
    collectionSlugs: ["everyday", "new-arrivals"], price: 74000, currency: "NGN",
    images: [img("momen-kaftan4-a"), img("momen-kaftan4-b")], hoverImage: img("momen-kaftan4-b"),
    colors: colorsFor("Sand", "Charcoal", "Stone"), sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "top", fabric: "Lightweight cotton poplin.",
    fabricIds: ["fab-premium-cotton"],
    description: "Stripped back to what matters — a relaxed, minimal kaftan for daily wear. No embroidery, no fuss, cut clean.",
    shortDescription: "A relaxed, minimal everyday kaftan.",
    details: ["Single chest pocket", "Made in Lagos"], careInstructions: ["Machine wash cold", "Line dry"],
    productionDays: accessoryTimeline, isNew: true, stock: "in-stock", crossSellCategorySlugs: ["footwear", "belts"],
  },
  {
    id: "p-kaftan-5", slug: "chidi-two-piece-kaftan-set", name: "Chidi Two-Piece Kaftan Set", category: "Kaftans",
    collectionSlugs: ["signature", "new-arrivals"], price: 158000, currency: "NGN",
    images: [img("momen-kaftan5-a"), img("momen-kaftan5-b"), img("momen-kaftan5-c")], hoverImage: img("momen-kaftan5-b"),
    colors: colorsFor("Olive", "Deep Brown", "Ink Black"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "set", fabric: "Premium cotton kaftan with matching tapered trouser.",
    fabricIds: ["fab-premium-cotton", "fab-linen"],
    description: "A kaftan and matching trouser, cut as one considered set. Wear together for full effect or apart for range through the week.",
    shortDescription: "Kaftan and matching trouser, made-to-measure.",
    details: ["Two-piece: kaftan + trouser", "Adjustable trouser waistband", "Made in Lagos"], careInstructions: ["Dry clean recommended", "Cool iron"],
    productionDays: heritageSet, isNew: true, isFeatured: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "belts", "caps"],
  },

  /* ── Senator ─────────────────────────────────────────────────────────── */
  {
    id: "p-senator-1", slug: "femi-senator-top", name: "Femi Senator Top", category: "Senator",
    collectionSlugs: ["everyday", "heritage"], price: 68000, currency: "NGN",
    images: [img("momen-senator1-a"), img("momen-senator1-b")], hoverImage: img("momen-senator1-b"),
    colors: colorsFor("Ink Black", "Deep Navy", "Charcoal", "Sand"), sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Classic Senator fabric with a clean structured drape.",
    fabricIds: ["fab-senator-classic", "fab-senator-premium"],
    description: "The Senator top, done properly — structured shoulders, a clean placket, and a fit calibrated to your frame. Momen's most-repeated silhouette.",
    shortDescription: "Structured Senator top, made-to-measure.",
    details: ["Mother-of-pearl buttons", "Single-needle stitching", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: standardTop, isFeatured: true, stock: "made-to-order", crossSellCategorySlugs: ["belts", "caps"],
  },
  {
    id: "p-senator-2", slug: "femi-senator-trouser", name: "Femi Senator Trouser", category: "Senator",
    collectionSlugs: ["everyday", "heritage"], price: 58000, currency: "NGN",
    images: [img("momen-senator2-a"), img("momen-senator2-b")], hoverImage: img("momen-senator2-b"),
    colors: colorsFor("Ink Black", "Deep Navy", "Charcoal", "Sand"), sizes: ["28", "30", "32", "34", "36", "38", "40"],
    productionType: "made-to-measure", customizable: true, garment: "trouser", fabric: "Classic Senator fabric, matched to the Senator top.",
    fabricIds: ["fab-senator-classic", "fab-senator-premium"],
    description: "The trouser half of the Senator set, available on its own for mixing and rewearing against other tops in your wardrobe.",
    shortDescription: "Senator trouser, made-to-measure.",
    details: ["Side-adjuster waistband", "Two side pockets", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: standardTrouser, stock: "made-to-order", crossSellCategorySlugs: ["belts"],
  },
  {
    id: "p-senator-3", slug: "kunle-complete-senator-set", name: "Kunle Complete Senator Set", category: "Senator",
    collectionSlugs: ["signature", "heritage", "new-arrivals"], price: 118000, currency: "NGN",
    images: [img("momen-senator3-a"), img("momen-senator3-b"), img("momen-senator3-c")], hoverImage: img("momen-senator3-b"),
    colors: colorsFor("Ink Black", "Deep Navy", "Deep Brown", "Charcoal"), sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
    productionType: "made-to-measure", customizable: true, garment: "set", fabric: "Premium Senator fabric, top and trouser cut as one commission.",
    fabricIds: ["fab-senator-classic", "fab-senator-premium"],
    description: "The complete Senator commission — top and trouser cut together for a fit that reads as one considered piece, not two separate purchases.",
    shortDescription: "Complete Senator set, made-to-measure.",
    details: ["Matched top and trouser", "Side-adjuster waistband", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: heritageSet, isFeatured: true, isSignature: true, isNew: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "belts", "caps"],
  },
  {
    id: "p-senator-4", slug: "bayo-embroidered-senator", name: "Bayo Embroidered Senator", category: "Senator",
    collectionSlugs: ["occasion", "heritage"], price: 145000, currency: "NGN",
    images: [img("momen-senator4-a"), img("momen-senator4-b")], hoverImage: img("momen-senator4-b"),
    colors: colorsFor("Ink Black", "Burgundy", "Deep Navy"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "set", fabric: "Premium Senator fabric with hand embroidery at the chest and cuffs.",
    fabricIds: ["fab-senator-premium", "fab-guinea-brocade"],
    description: "A Senator set elevated with chest and cuff embroidery — considered enough for a formal event, restrained enough to wear again.",
    shortDescription: "Embroidered Senator set for occasion wear.",
    details: ["Chest and cuff embroidery", "Matched top and trouser", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: heritageSet, isFeatured: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "belts", "other-accessories"],
  },
  {
    id: "p-senator-5", slug: "segun-occasion-senator", name: "Segun Occasion Senator", category: "Senator",
    collectionSlugs: ["occasion", "limited-edition"], price: 172000, currency: "NGN",
    images: [img("momen-senator5-a"), img("momen-senator5-b")], hoverImage: img("momen-senator5-b"),
    colors: colorsFor("Bronze", "Ivory"), sizes: ["M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "set", fabric: "George fabric with hand-stitched edge detailing.",
    fabricIds: ["fab-george", "fab-guinea-brocade"],
    description: "Our most formal Senator commission — George fabric, hand-finished edges, built for the day you want every detail considered.",
    shortDescription: "George-fabric occasion Senator set.",
    details: ["Hand-stitched edging", "Limited fabric run", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: heritageSet, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "other-accessories"],
  },

  /* ── Agbada ──────────────────────────────────────────────────────────── */
  {
    id: "p-agbada-1", slug: "adebayo-complete-agbada-set", name: "Adebayo Complete Agbada Set", category: "Agbada",
    collectionSlugs: ["signature", "heritage", "occasion"], price: 265000, currency: "NGN",
    images: [img("momen-agbada1-a"), img("momen-agbada1-b"), img("momen-agbada1-c")], hoverImage: img("momen-agbada1-b"),
    colors: colorsFor("Ink Black", "Ivory", "Deep Navy"), sizes: ["M", "L", "XL", "XXL", "XXXL"],
    productionType: "made-to-measure", customizable: true, garment: "agbada", fabric: "Guinea brocade outer robe with matching inner Senator set.",
    fabricIds: ["fab-guinea-brocade", "fab-senator-premium"],
    description: "The complete commission — flowing outer robe, inner Senator top and trouser, and cap, all cut together. Momen's most-requested piece for weddings and chieftaincy events.",
    shortDescription: "Complete Agbada with inner Senator set.",
    details: ["Outer robe + inner Senator top & trouser", "Matching cap included", "Made in Lagos"], careInstructions: ["Dry clean only", "Store in garment bag"],
    productionDays: agbadaTimeline, isFeatured: true, isSignature: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps", "other-accessories"],
  },
  {
    id: "p-agbada-2", slug: "emeka-agbada-top", name: "Emeka Agbada Top", category: "Agbada",
    collectionSlugs: ["heritage"], price: 148000, currency: "NGN",
    images: [img("momen-agbada2-a"), img("momen-agbada2-b")], hoverImage: img("momen-agbada2-b"),
    colors: colorsFor("Charcoal", "Deep Brown"), sizes: ["M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "agbada", fabric: "Premium cotton outer robe, worn over your own inner wear.",
    fabricIds: ["fab-premium-cotton", "fab-senator-classic"],
    description: "The outer Agbada robe on its own, for pairing with an inner set you already own or building your ceremonial wardrobe piece by piece.",
    shortDescription: "Outer Agbada robe, sold separately.",
    details: ["Outer robe only", "Wide sleeve drape", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: agbadaTimeline, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps"],
  },
  {
    id: "p-agbada-3", slug: "olumide-embroidered-agbada", name: "Olumide Embroidered Agbada", category: "Agbada",
    collectionSlugs: ["signature", "occasion"], price: 298000, currency: "NGN",
    images: [img("momen-agbada3-a"), img("momen-agbada3-b"), img("momen-agbada3-c")], hoverImage: img("momen-agbada3-b"),
    colors: colorsFor("Ink Black", "Bronze"), sizes: ["L", "XL", "XXL", "XXXL"],
    productionType: "made-to-measure", customizable: true, garment: "agbada", fabric: "Aso-Oke chest panel set into a Guinea brocade Agbada.",
    fabricIds: ["fab-aso-oke", "fab-guinea-brocade"],
    description: "Hand embroidery across the chest and hem, with an Aso-Oke panel at the centre front. Reserved for the days meant to be remembered.",
    shortDescription: "Hand-embroidered signature Agbada.",
    details: ["Hand embroidery", "Aso-Oke chest panel", "Matching cap included", "Made in Lagos"], careInstructions: ["Dry clean only", "Store in garment bag"],
    productionDays: agbadaTimeline, isFeatured: true, isSignature: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps", "other-accessories"],
  },
  {
    id: "p-agbada-4", slug: "chief-occasion-agbada", name: "Chief Occasion Agbada", category: "Agbada",
    collectionSlugs: ["occasion", "limited-edition"], price: 345000, currency: "NGN",
    images: [img("momen-agbada4-a"), img("momen-agbada4-b")], hoverImage: img("momen-agbada4-b"),
    colors: colorsFor("Ivory", "Bronze"), sizes: ["L", "XL", "XXL", "XXXL"],
    productionType: "made-to-measure", customizable: true, garment: "agbada", fabric: "Full Aso-Oke Agbada, hand-loomed and limited by fabric availability.",
    fabricIds: ["fab-aso-oke"],
    description: "A full Aso-Oke Agbada — the most formal expression of the silhouette, made in strictly limited numbers as fabric allows.",
    shortDescription: "Full Aso-Oke Agbada, strictly limited.",
    details: ["Full Aso-Oke construction", "Limited by fabric availability", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: agbadaTimeline, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps"],
  },

  /* ── Jalabia ─────────────────────────────────────────────────────────── */
  {
    id: "p-jalabia-1", slug: "yusuf-traditional-jalabia", name: "Yusuf Traditional Jalabia", category: "Jalabia",
    collectionSlugs: ["heritage", "everyday"], price: 78000, currency: "NGN",
    images: [img("momen-jalabia1-a"), img("momen-jalabia1-b")], hoverImage: img("momen-jalabia1-b"),
    colors: colorsFor("Ivory", "Ink Black", "Sand"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Lightweight premium cotton, cut for ease of movement.",
    fabricIds: ["fab-premium-cotton", "fab-linen"],
    description: "A traditional Jalabia silhouette in a lightweight cotton, cut for comfort during prayer and daily wear alike.",
    shortDescription: "Traditional Jalabia in lightweight cotton.",
    details: ["Relaxed fit", "Side pockets", "Made in Lagos"], careInstructions: ["Machine wash cold", "Hang dry"],
    productionDays: standardTop, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps"],
  },
  {
    id: "p-jalabia-2", slug: "ibrahim-contemporary-jalabia", name: "Ibrahim Contemporary Jalabia", category: "Jalabia",
    collectionSlugs: ["contemporary", "new-arrivals"], price: 89000, currency: "NGN",
    images: [img("momen-jalabia2-a"), img("momen-jalabia2-b")], hoverImage: img("momen-jalabia2-b"),
    colors: colorsFor("Charcoal", "Olive", "Deep Navy"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Structured cotton with a slimmer, contemporary cut.",
    fabricIds: ["fab-premium-cotton", "fab-senator-classic"],
    description: "A slimmer, more structured take on the Jalabia — for the man who wants the tradition without the extra volume.",
    shortDescription: "Slim, contemporary-cut Jalabia.",
    details: ["Slim contemporary cut", "Mandarin collar", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: standardTop, isNew: true, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "belts"],
  },
  {
    id: "p-jalabia-3", slug: "musa-embroidered-jalabia", name: "Musa Embroidered Jalabia", category: "Jalabia",
    collectionSlugs: ["occasion", "heritage"], price: 124000, currency: "NGN",
    images: [img("momen-jalabia3-a"), img("momen-jalabia3-b")], hoverImage: img("momen-jalabia3-b"),
    colors: colorsFor("Ink Black", "Bronze"), sizes: ["M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Premium cotton with hand embroidery at the neckline and cuffs.",
    fabricIds: ["fab-premium-cotton", "fab-silk-cotton"],
    description: "Embroidered detailing at the neckline and cuffs lifts this Jalabia for Jummah, Eid, and family celebrations.",
    shortDescription: "Embroidered premium occasion Jalabia.",
    details: ["Neckline and cuff embroidery", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: heritageSet, stock: "made-to-order", crossSellCategorySlugs: ["footwear", "caps"],
  },

  /* ── Shirts ──────────────────────────────────────────────────────────── */
  {
    id: "p-shirt-1", slug: "obi-native-shirt", name: "Obi Native Shirt", category: "Shirts",
    collectionSlugs: ["signature", "everyday"], price: 68000, currency: "NGN",
    images: [img("momen-shirt1-a"), img("momen-shirt1-b"), img("momen-shirt1-c")], hoverImage: img("momen-shirt1-b"),
    colors: colorsFor("Ivory", "Charcoal", "Sand"), sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "100% long-staple cotton poplin, garment-washed for softness.",
    fabricIds: ["fab-premium-cotton", "fab-senator-classic"],
    description: "A considered native shirt — clean lines, a soft roll collar, and a fit that holds its shape through the day.",
    shortDescription: "Clean, considered native shirt.",
    details: ["Mother-of-pearl buttons", "Split yoke for ease of movement", "Made in Lagos"], careInstructions: ["Machine wash cold", "Hang dry"],
    productionDays: standardTop, isFeatured: true, stock: "made-to-order", crossSellCategorySlugs: ["belts", "other-accessories"],
  },
  {
    id: "p-shirt-2", slug: "tobi-linen-shirt", name: "Tobi Linen Shirt", category: "Shirts",
    collectionSlugs: ["new-arrivals", "everyday"], price: 62000, currency: "NGN",
    images: [img("momen-shirt2-a"), img("momen-shirt2-b")], hoverImage: img("momen-shirt2-b"),
    colors: colorsFor("Cream", "Olive"), sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "top", fabric: "100% European linen.",
    fabricIds: ["fab-linen"],
    description: "A breathable warm-weather staple in pure linen, finished with a relaxed camp collar. True to size, ready to wear.",
    shortDescription: "Warm-weather linen shirt.",
    details: ["Camp collar", "Single chest pocket", "Made in Lagos"], careInstructions: ["Machine wash cold", "Line dry"],
    productionDays: accessoryTimeline, isNew: true, stock: "in-stock", crossSellCategorySlugs: ["belts"],
  },
  {
    id: "p-shirt-3", slug: "ade-ankara-shirt", name: "Ade Ankara Shirt", category: "Shirts",
    collectionSlugs: ["contemporary", "new-arrivals"], price: 71000, currency: "NGN",
    images: [img("momen-shirt3-a"), img("momen-shirt3-b")], hoverImage: img("momen-shirt3-b"),
    colors: colorsFor("Terracotta", "Rust"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Vibrant Ankara wax print, fully lined at the yoke.",
    fabricIds: ["fab-ankara"],
    description: "Bold Ankara print cut into a modern shirt silhouette — for the man who wants his tailoring to say something.",
    shortDescription: "Bold Ankara-print shirt.",
    details: ["Ankara wax print", "Lined yoke", "Made in Lagos"], careInstructions: ["Hand wash recommended"],
    productionDays: standardTop, isNew: true, stock: "made-to-order", crossSellCategorySlugs: ["belts", "other-accessories"],
  },
  {
    id: "p-shirt-4", slug: "dara-embroidered-shirt", name: "Dara Embroidered Shirt", category: "Shirts",
    collectionSlugs: ["occasion", "signature"], price: 96000, currency: "NGN",
    images: [img("momen-shirt4-a"), img("momen-shirt4-b")], hoverImage: img("momen-shirt4-b"),
    colors: colorsFor("Ink Black", "Ivory"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Premium cotton with chest embroidery.",
    fabricIds: ["fab-premium-cotton", "fab-silk-cotton"],
    description: "A dress shirt with restrained chest embroidery — sharp enough for the office, considered enough for dinner after.",
    shortDescription: "Embroidered dress shirt.",
    details: ["Chest embroidery", "French placket", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: standardTop, stock: "made-to-order", crossSellCategorySlugs: ["belts", "other-accessories"],
  },
  {
    id: "p-shirt-5", slug: "kayode-resort-shirt", name: "Kayode Resort Shirt", category: "Shirts",
    collectionSlugs: ["everyday", "new-arrivals"], price: 54000, currency: "NGN",
    images: [img("momen-shirt5-a"), img("momen-shirt5-b")], hoverImage: img("momen-shirt5-b"),
    colors: colorsFor("Sand", "Olive", "Ivory"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "top", fabric: "Textured cotton-blend, cut for warm-weather ease.",
    fabricIds: ["fab-linen", "fab-premium-cotton"],
    description: "Short-sleeve, open weave, built for the resort and the weekend that follows it home.",
    shortDescription: "Short-sleeve resort shirt.",
    details: ["Open weave texture", "Relaxed fit", "Made in Lagos"], careInstructions: ["Machine wash cold"],
    productionDays: accessoryTimeline, isNew: true, stock: "in-stock", crossSellCategorySlugs: ["footwear"],
  },
  {
    id: "p-shirt-6", slug: "wale-formal-shirt", name: "Wale Formal Long-Sleeve Shirt", category: "Shirts",
    collectionSlugs: ["everyday", "signature"], price: 66000, currency: "NGN",
    images: [img("momen-shirt6-a"), img("momen-shirt6-b")], hoverImage: img("momen-shirt6-b"),
    colors: colorsFor("Ivory", "Deep Navy", "Charcoal"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "made-to-measure", customizable: true, garment: "top", fabric: "Fine cotton poplin with a crisp, formal finish.",
    fabricIds: ["fab-premium-cotton", "fab-wool-blend"],
    description: "A precise formal shirt, cut to your neck, chest, and sleeve for a collar that sits right every time.",
    shortDescription: "Precise formal shirt, made-to-measure.",
    details: ["Spread collar", "Barrel cuffs", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: standardTop, stock: "made-to-order", crossSellCategorySlugs: ["belts", "other-accessories"],
  },

  /* ── Pants ───────────────────────────────────────────────────────────── */
  {
    id: "p-pants-1", slug: "femi-straight-trouser", name: "Femi Straight Trouser", category: "Pants",
    collectionSlugs: ["everyday", "signature"], price: 74000, currency: "NGN",
    images: [img("momen-pants1-a"), img("momen-pants1-b")], hoverImage: img("momen-pants1-b"),
    colors: colorsFor("Ink Black", "Stone", "Deep Navy"), sizes: ["28", "30", "32", "34", "36", "38"],
    productionType: "made-to-measure", customizable: true, garment: "trouser", fabric: "Mid-weight wool-blend suiting.",
    fabricIds: ["fab-wool-blend", "fab-senator-classic"],
    description: "A precise straight-leg trouser with a clean waistband and a break calibrated to your height. One of our most-repeated silhouettes.",
    shortDescription: "Precise straight-leg tailored trouser.",
    details: ["Side-adjuster waistband", "Two side pockets, one back pocket", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: standardTrouser, stock: "made-to-order", crossSellCategorySlugs: ["belts", "footwear"],
  },
  {
    id: "p-pants-2", slug: "tayo-tapered-trouser", name: "Tayo Tapered Trouser", category: "Pants",
    collectionSlugs: ["everyday"], price: 71000, currency: "NGN",
    images: [img("momen-pants2-a"), img("momen-pants2-b")], hoverImage: img("momen-pants2-b"),
    colors: colorsFor("Ink Black", "Deep Brown"), sizes: ["28", "30", "32", "34", "36"],
    productionType: "ready-to-wear", garment: "trouser", fabric: "Ponte knit with mechanical stretch.",
    fabricIds: ["fab-wool-blend"],
    description: "A tapered trouser with just enough give for movement. Ready to wear, no fitting required.",
    shortDescription: "Tapered trouser with mechanical stretch.",
    details: ["Elasticated inner waistband", "Two front pockets", "Made in Lagos"], careInstructions: ["Machine wash cold", "Hang dry"],
    productionDays: accessoryTimeline, stock: "low-stock", crossSellCategorySlugs: ["belts"],
  },
  {
    id: "p-pants-3", slug: "chuka-senator-trouser", name: "Chuka Senator Trouser", category: "Pants",
    collectionSlugs: ["heritage", "everyday"], price: 58000, currency: "NGN",
    images: [img("momen-pants3-a"), img("momen-pants3-b")], hoverImage: img("momen-pants3-b"),
    colors: colorsFor("Ink Black", "Charcoal", "Sand"), sizes: ["28", "30", "32", "34", "36", "38", "40"],
    productionType: "made-to-measure", customizable: true, garment: "trouser", fabric: "Classic Senator fabric.",
    fabricIds: ["fab-senator-classic"],
    description: "Senator trousers cut on their own — pair with any Senator or native top for a considered rotation.",
    shortDescription: "Classic Senator trouser.",
    details: ["Side-adjuster waistband", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: standardTrouser, stock: "made-to-order", crossSellCategorySlugs: ["belts"],
  },
  {
    id: "p-pants-4", slug: "bola-ankara-pants", name: "Bola Ankara Pants", category: "Pants",
    collectionSlugs: ["contemporary", "new-arrivals"], price: 62000, currency: "NGN",
    images: [img("momen-pants4-a"), img("momen-pants4-b")], hoverImage: img("momen-pants4-b"),
    colors: colorsFor("Terracotta", "Olive"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "trouser", gender: "unisex", fabric: "Vibrant Ankara wax print cotton.",
    fabricIds: ["fab-ankara"],
    description: "Wide-leg Ankara pants in bold graphic print — one of Momen's most-worn unisex pieces, styled by men and women alike.",
    shortDescription: "Wide-leg Ankara print pants.",
    details: ["Wide-leg cut", "Elasticated waistband", "Made in Lagos"], careInstructions: ["Hand wash recommended"],
    productionDays: accessoryTimeline, isNew: true, stock: "in-stock", crossSellCategorySlugs: ["footwear", "belts"],
  },
  {
    id: "p-pants-5", slug: "ola-aso-oke-pants", name: "Ola Aso-Oke Pants", category: "Pants",
    collectionSlugs: ["limited-edition", "contemporary"], price: 98000, currency: "NGN",
    images: [img("momen-pants5-a"), img("momen-pants5-b")], hoverImage: img("momen-pants5-b"),
    colors: colorsFor("Bronze", "Ivory"), sizes: ["S", "M", "L", "XL"],
    productionType: "made-to-measure", customizable: true, garment: "trouser", gender: "unisex", fabric: "Hand-loomed Aso-Oke.",
    fabricIds: ["fab-aso-oke"],
    description: "Hand-loomed Aso-Oke cut into a modern relaxed trouser — a small-batch, unisex piece limited by fabric availability.",
    shortDescription: "Relaxed Aso-Oke trouser, unisex.",
    details: ["Hand-loomed Aso-Oke", "Limited fabric run", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: heritageSet, stock: "made-to-order", crossSellCategorySlugs: ["footwear"],
  },

  /* ── Casual Wear ─────────────────────────────────────────────────────── */
  {
    id: "p-casual-1", slug: "momen-signature-tee", name: "Momen Signature Tee", category: "Casual Wear",
    collectionSlugs: ["everyday", "new-arrivals"], price: 32000, currency: "NGN",
    images: [img("momen-casual1-a"), img("momen-casual1-b")], hoverImage: img("momen-casual1-b"),
    colors: colorsFor("Ink Black", "Ivory", "Charcoal"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "top", fabric: "Heavyweight combed cotton jersey.",
    fabricIds: ["fab-premium-cotton"],
    description: "A heavyweight tee, cut with a considered drape and finished with a small embroidered Momen mark. The quiet foundation of a Momen wardrobe.",
    shortDescription: "Heavyweight signature cotton tee.",
    details: ["Heavyweight jersey", "Embroidered logo", "Made in Lagos"], careInstructions: ["Machine wash cold"],
    productionDays: accessoryTimeline, isNew: true, stock: "in-stock", crossSellCategorySlugs: ["footwear", "caps"],
  },
  {
    id: "p-casual-2", slug: "lekki-polo-shirt", name: "Lekki Polo Shirt", category: "Casual Wear",
    collectionSlugs: ["everyday"], price: 44000, currency: "NGN",
    images: [img("momen-casual2-a"), img("momen-casual2-b")], hoverImage: img("momen-casual2-b"),
    colors: colorsFor("Olive", "Deep Navy", "Stone"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "top", fabric: "Pique cotton knit.",
    fabricIds: ["fab-premium-cotton"],
    description: "A clean pique polo with a structured collar — smart enough for a casual Friday, relaxed enough for the weekend.",
    shortDescription: "Structured pique polo.",
    details: ["Ribbed collar and cuffs", "Made in Lagos"], careInstructions: ["Machine wash cold"],
    productionDays: accessoryTimeline, stock: "in-stock", crossSellCategorySlugs: ["belts", "footwear"],
  },
  {
    id: "p-casual-3", slug: "weekend-two-piece-set", name: "Weekend Two-Piece Set", category: "Casual Wear",
    collectionSlugs: ["everyday", "new-arrivals"], price: 86000, currency: "NGN",
    images: [img("momen-casual3-a"), img("momen-casual3-b")], hoverImage: img("momen-casual3-b"),
    colors: colorsFor("Sand", "Charcoal"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "set", gender: "unisex", fabric: "Brushed cotton-linen twill.",
    fabricIds: ["fab-linen", "fab-premium-cotton"],
    description: "A relaxed shirt-jacket and matching trouser, worn together or apart. Cut generously and shared across Momen's unisex edit.",
    shortDescription: "Relaxed unisex two-piece set.",
    details: ["Two-piece: jacket + trouser", "Relaxed fit", "Made in Lagos"], careInstructions: ["Dry clean recommended"],
    productionDays: standardTrouser, isNew: true, stock: "in-stock", crossSellCategorySlugs: ["footwear"],
  },
  {
    id: "p-casual-4", slug: "resort-shorts", name: "Resort Shorts", category: "Casual Wear",
    collectionSlugs: ["everyday"], price: 38000, currency: "NGN",
    images: [img("momen-casual4-a"), img("momen-casual4-b")], hoverImage: img("momen-casual4-b"),
    colors: colorsFor("Sand", "Olive", "Ink Black"), sizes: ["S", "M", "L", "XL", "XXL"],
    productionType: "ready-to-wear", garment: "trouser", fabric: "Lightweight cotton twill.",
    fabricIds: ["fab-premium-cotton"],
    description: "Tailored resort shorts, finished above the knee — built for warm-weather travel.",
    shortDescription: "Tailored resort shorts.",
    details: ["Side pockets", "Drawstring waist", "Made in Lagos"], careInstructions: ["Machine wash cold"],
    productionDays: accessoryTimeline, stock: "in-stock", crossSellCategorySlugs: ["footwear"],
  },
  {
    id: "p-casual-5", slug: "oversized-relaxed-shirt", name: "Oversized Relaxed Shirt", category: "Casual Wear",
    collectionSlugs: ["contemporary", "new-arrivals"], price: 56000, currency: "NGN",
    images: [img("momen-casual5-a"), img("momen-casual5-b")], hoverImage: img("momen-casual5-b"),
    colors: colorsFor("Stone", "Charcoal", "Ivory"), sizes: ["S", "M", "L", "XL"],
    productionType: "ready-to-wear", garment: "top", gender: "unisex", fabric: "Washed cotton poplin.",
    fabricIds: ["fab-premium-cotton", "fab-linen"],
    description: "A deliberately oversized shirt with dropped shoulders — one of the pieces that anchors Momen's unisex edit.",
    shortDescription: "Oversized dropped-shoulder shirt, unisex.",
    details: ["Dropped shoulder", "Oversized fit", "Made in Lagos"], careInstructions: ["Machine wash cold"],
    productionDays: accessoryTimeline, isNew: true, stock: "in-stock", crossSellCategorySlugs: ["footwear", "caps"],
  },

  /* ── Accessories: Footwear ───────────────────────────────────────────── */
  {
    id: "p-acc-1", slug: "classic-pam-sandals", name: "Classic Pam Sandals", category: "Footwear",
    collectionSlugs: ["everyday", "signature"], price: 42000, currency: "NGN",
    images: [img("momen-pam1-a"), img("momen-pam1-b")], hoverImage: img("momen-pam1-b"),
    colors: colorsFor("Ink Black", "Deep Brown", "Sand"), sizes: ["40", "41", "42", "43", "44", "45", "46"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Genuine leather upper and sole.",
    description: "The Momen pam sandal — genuine leather, a low profile, and the finishing touch on every native outfit.",
    shortDescription: "Genuine leather pam sandals.",
    details: ["Genuine leather", "Made in Lagos"], careInstructions: ["Wipe clean", "Leather conditioner recommended"],
    productionDays: accessoryTimeline, isFeatured: true, stock: "in-stock",
  },
  {
    id: "p-acc-2", slug: "leather-woven-sandals", name: "Leather Woven Sandals", category: "Footwear",
    collectionSlugs: ["everyday"], price: 46000, currency: "NGN",
    images: [img("momen-pam2-a"), img("momen-pam2-b")], hoverImage: img("momen-pam2-b"),
    colors: colorsFor("Deep Brown", "Ink Black"), sizes: ["40", "41", "42", "43", "44", "45"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Hand-woven leather straps on a leather sole.",
    description: "Hand-woven leather straps, built for texture and durability in equal measure.",
    shortDescription: "Hand-woven leather sandals.",
    details: ["Hand-woven straps", "Leather sole", "Made in Lagos"], careInstructions: ["Wipe clean"],
    productionDays: accessoryTimeline, stock: "in-stock",
  },
  {
    id: "p-acc-3", slug: "traditional-beaded-sandals", name: "Traditional Beaded Sandals", category: "Footwear",
    collectionSlugs: ["heritage", "occasion"], price: 52000, currency: "NGN",
    images: [img("momen-pam3-a"), img("momen-pam3-b")], hoverImage: img("momen-pam3-b"),
    colors: colorsFor("Ivory", "Bronze"), sizes: ["40", "41", "42", "43", "44", "45"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Leather base with hand-applied beadwork.",
    description: "Hand-applied beadwork on a leather base — the occasion sandal for Agbada and premium kaftan.",
    shortDescription: "Hand-beaded occasion sandals.",
    details: ["Hand-applied beadwork", "Made in Lagos"], careInstructions: ["Wipe clean", "Store in dust bag"],
    productionDays: accessoryTimeline, stock: "low-stock",
  },

  /* ── Accessories: Belts, Bags, Caps, Other ──────────────────────────── */
  {
    id: "p-acc-4", slug: "full-grain-leather-belt", name: "Full-Grain Leather Belt", category: "Belts",
    collectionSlugs: ["everyday", "signature"], price: 36000, currency: "NGN",
    images: [img("momen-belt1-a"), img("momen-belt1-b")], hoverImage: img("momen-belt1-b"),
    colors: colorsFor("Ink Black", "Deep Brown"), sizes: ["32", "34", "36", "38", "40"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Full-grain leather with a brushed metal buckle.",
    description: "A full-grain leather belt with a brushed metal buckle — built to age well and outlast the trousers it's paired with.",
    shortDescription: "Full-grain leather belt.",
    details: ["Brushed metal buckle", "Made in Lagos"], careInstructions: ["Wipe clean", "Leather conditioner recommended"],
    productionDays: accessoryTimeline, isFeatured: true, stock: "in-stock",
  },
  {
    id: "p-acc-5", slug: "structured-leather-bag", name: "Structured Leather Bag", category: "Bags",
    collectionSlugs: ["signature"], price: 128000, currency: "NGN",
    images: [img("momen-bag1-a"), img("momen-bag1-b")], hoverImage: img("momen-bag1-b"),
    colors: colorsFor("Ink Black", "Deep Brown"), sizes: ["One Size"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Structured full-grain leather with a canvas lining.",
    description: "A structured leather bag built for the commute and the weekend away — clean lines, considered hardware, no logos.",
    shortDescription: "Structured full-grain leather bag.",
    details: ["Canvas lining", "Adjustable strap", "Made in Lagos"], careInstructions: ["Wipe clean", "Store in dust bag"],
    productionDays: accessoryTimeline, isFeatured: true, stock: "in-stock",
  },
  {
    id: "p-acc-6", slug: "woven-raffia-cap", name: "Woven Raffia Cap", category: "Caps",
    collectionSlugs: ["everyday", "contemporary"], price: 24000, currency: "NGN",
    images: [img("momen-cap1-a"), img("momen-cap1-b")], hoverImage: img("momen-cap1-b"),
    colors: colorsFor("Sand", "Ivory"), sizes: ["One Size"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Hand-woven raffia.",
    description: "A hand-woven raffia cap for warm-weather styling — pairs naturally with linen and cotton.",
    shortDescription: "Hand-woven raffia cap.",
    details: ["Hand-woven", "One size, adjustable"], careInstructions: ["Spot clean only"],
    productionDays: accessoryTimeline, stock: "in-stock",
  },
  {
    id: "p-acc-7", slug: "aso-oke-cap-fila", name: "Aso-Oke Cap (Fila)", category: "Caps",
    collectionSlugs: ["heritage", "occasion"], price: 34000, currency: "NGN",
    images: [img("momen-cap2-a"), img("momen-cap2-b")], hoverImage: img("momen-cap2-b"),
    colors: colorsFor("Ink Black", "Bronze", "Ivory"), sizes: ["One Size"],
    productionType: "ready-to-wear", customizable: false, garment: "accessory", fabric: "Hand-loomed Aso-Oke, structured to shape.",
    description: "The traditional fila, hand-shaped from Aso-Oke to complete an Agbada or Senator set.",
    shortDescription: "Traditional Aso-Oke fila.",
    details: ["Hand-loomed Aso-Oke", "Made in Lagos"], careInstructions: ["Spot clean only", "Store in dust bag"],
    productionDays: accessoryTimeline, isFeatured: true, stock: "made-to-order",
  },
  {
    id: "p-acc-8", slug: "signature-leather-wallet", name: "Signature Leather Wallet", category: "Other Accessories",
    collectionSlugs: ["everyday", "signature"], price: 28000, currency: "NGN",
    images: [img("momen-wallet1-a"), img("momen-wallet1-b")], hoverImage: img("momen-wallet1-b"),
    colors: colorsFor("Ink Black", "Deep Brown"), sizes: ["One Size"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Full-grain leather, hand-stitched.",
    description: "A slim, hand-stitched leather wallet — six card slots, one bill pocket, no unnecessary bulk.",
    shortDescription: "Slim hand-stitched leather wallet.",
    details: ["Six card slots", "Hand-stitched", "Made in Lagos"], careInstructions: ["Wipe clean"],
    productionDays: accessoryTimeline, stock: "in-stock",
  },
  {
    id: "p-acc-9", slug: "beaded-bracelet-set", name: "Beaded Bracelet Set", category: "Other Accessories",
    collectionSlugs: ["contemporary", "everyday"], price: 18000, currency: "NGN",
    images: [img("momen-bracelet1-a"), img("momen-bracelet1-b")], hoverImage: img("momen-bracelet1-b"),
    colors: colorsFor("Bronze", "Ink Black", "Terracotta"), sizes: ["One Size"],
    productionType: "ready-to-wear", garment: "accessory", gender: "unisex", fabric: "Natural beads on waxed cord.",
    description: "A set of three beaded bracelets in natural stone and wood tones — a small, considered finish shared across the unisex edit.",
    shortDescription: "Set of three beaded bracelets, unisex.",
    details: ["Set of three", "Waxed cord", "Made in Lagos"], careInstructions: ["Keep dry"],
    productionDays: accessoryTimeline, isNew: true, stock: "in-stock",
  },
  {
    id: "p-acc-10", slug: "silk-pocket-square", name: "Silk Pocket Square", category: "Other Accessories",
    collectionSlugs: ["occasion", "signature"], price: 16000, currency: "NGN",
    images: [img("momen-square1-a"), img("momen-square1-b")], hoverImage: img("momen-square1-b"),
    colors: colorsFor("Burgundy", "Ink Black", "Bronze"), sizes: ["One Size"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Silk-cotton blend with hand-rolled edges.",
    description: "A hand-rolled silk-cotton pocket square — the finishing detail for Agbada and formal Senator sets.",
    shortDescription: "Hand-rolled silk pocket square.",
    details: ["Hand-rolled edges", "Made in Lagos"], careInstructions: ["Dry clean only"],
    productionDays: accessoryTimeline, stock: "in-stock",
  },
  {
    id: "p-acc-11", slug: "cufflink-set", name: "Cufflink Set", category: "Other Accessories",
    collectionSlugs: ["occasion", "everyday"], price: 22000, currency: "NGN",
    images: [img("momen-cufflink1-a"), img("momen-cufflink1-b")], hoverImage: img("momen-cufflink1-b"),
    colors: colorsFor("Bronze", "Ink Black"), sizes: ["One Size"],
    productionType: "ready-to-wear", garment: "accessory", fabric: "Brushed metal with an enamel inlay.",
    description: "Brushed metal cufflinks with a subtle enamel inlay — a quiet finishing detail for French cuffs.",
    shortDescription: "Brushed metal cufflinks.",
    details: ["Enamel inlay", "Presented in a Momen box"], careInstructions: ["Wipe clean"],
    productionDays: accessoryTimeline, stock: "in-stock",
  },
];

// ── Derive the full admin-shaped catalog from the raw editorial data above.
const CREATED_BASE = new Date("2025-11-01T09:00:00Z").getTime();
const DAY = 86_400_000;

export const products: Product[] = rawProducts.map((p, i) => {
  const customizable = p.customizable ?? (p.productionType === "made-to-measure" && p.garment !== "accessory");
  const productType: ProductType = p.garment === "accessory" ? "accessory" : customizable ? "customizable" : p.productionType;
  const sizingMode: SizingMode = p.sizingMode ?? (p.garment === "accessory" ? "one-size" : p.productionType === "made-to-measure" ? "both" : "standard");
  return {
    ...p,
    gender: p.gender ?? "men",
    productType,
    sizingMode,
    customizable,
    referenceImagesAllowed: customizable,
    specialInstructionsAllowed: customizable,
    sku: `MOM-${p.garment.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
    tags: [p.category, p.productionType === "made-to-measure" ? "Made-to-Measure" : "Ready-to-Wear", ...(p.isNew ? ["New"] : []), ...(p.gender === "unisex" ? ["Unisex"] : [])],
    stockQuantity: p.stock === "in-stock" ? 42 : p.stock === "low-stock" ? 6 : p.stock === "out-of-stock" ? 0 : 999,
    lowStockThreshold: 10,
    publishStatus: "published",
    expressEligible: true,
    customization: defaultCustomizationForGarment(p.garment, customizable),
    seo: {
      title: `${p.name} | Momen`,
      description: p.description.slice(0, 155),
      slug: p.slug,
      socialTitle: p.name,
      socialDescription: p.description.slice(0, 155),
      noIndex: false,
    },
    createdAt: new Date(CREATED_BASE - i * 3 * DAY).toISOString(),
    updatedAt: new Date(CREATED_BASE - i * DAY + 20 * DAY).toISOString(),
  };
});

export const featuredProducts = products.filter((p) => p.isFeatured);
export const signatureProducts = products.filter((p) => p.isSignature);

export const collections: Collection[] = rawCollections.map((c, i) => ({
  ...c,
  id: `col-${c.slug}`,
  publishStatus: "published",
  expressEligible: true,
  sortOrder: i,
  productSlugs: products.filter((p) => p.collectionSlugs.includes(c.slug)).map((p) => p.slug),
  seo: {
    title: `${c.name} | Momen`,
    description: c.description,
    slug: c.slug,
    socialTitle: c.name,
    socialDescription: c.description,
    noIndex: false,
  },
}));

export const categories: Category[] = rawCategories.map((c, i) => ({
  id: `cat-${c.slug}`,
  slug: c.slug,
  name: c.name,
  description: c.description,
  parentId: c.parentSlug ? `cat-${c.parentSlug}` : undefined,
  sortOrder: i,
  publishStatus: "published",
  seo: { title: `${c.name} | Momen`, description: c.description, slug: c.slug },
}));

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getCollectionBySlug(slug: string) {
  return collections.find((c) => c.slug === slug);
}

export function getProductsForCollection(slug: string) {
  return products.filter((p) => p.collectionSlugs.includes(slug));
}

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getAccessorySuggestions(product: Product, count = 4) {
  const slugs = product.crossSellCategorySlugs ?? [];
  if (slugs.length === 0) return [];
  const pool = products.filter((p) => p.id !== product.id && slugs.includes(p.category.toLowerCase().replace(/\s+/g, "-")));
  return pool.slice(0, count);
}

export const defaultProductionSettings: ProductionSettings = {
  standardDays: [7, 14],
  expressDays: [3, 5],
  standardFee: 3500,
  expressFee: 25000,
  regions: ["Nigeria (all states)", "Ghana", "United Kingdom", "United States", "Canada"],
};

/* ───────────────────────────── Measurement fields ───────────────────────────── */

const measureImg = (seed: string) => img(seed, 600, 600);

export const measurementFieldDefs: MeasurementFieldDef[] = [
  {
    key: "chest", label: "Chest", description: "Chest circumference.",
    instructions: "Wrap the measuring tape around the fullest part of your chest, under your arms and across your shoulder blades. Keep the tape level and comfortably snug without pulling it tightly.",
    commonMistakes: "Don't pull the tape too tight, and don't let it sag at the back — keep it level all the way around.",
    illustration: measureImg("measure-chest"), unit: "cm", required: true, garments: ["top", "set", "agbada"], sortOrder: 0, minCm: 75, maxCm: 160,
  },
  {
    key: "neck", label: "Neck", description: "Neck circumference.",
    instructions: "Wrap the tape around the base of your neck, where a shirt collar would naturally sit. Leave enough room to fit one finger between the tape and your neck.",
    commonMistakes: "Measuring too high on the neck, or pulling the tape too tight to breathe comfortably.",
    illustration: measureImg("measure-neck"), unit: "cm", required: true, garments: ["top"], sortOrder: 1, minCm: 32, maxCm: 55,
  },
  {
    key: "shoulder", label: "Shoulder", description: "Shoulder-to-shoulder width.",
    instructions: "Measure across your back from the edge of one shoulder bone to the edge of the other, following the natural slope.",
    commonMistakes: "Measuring in a straight line instead of following the shoulder slope.",
    illustration: measureImg("measure-shoulder"), unit: "cm", required: true, garments: ["top", "set", "agbada"], sortOrder: 2, minCm: 38, maxCm: 60,
  },
  {
    key: "sleeveLength", label: "Sleeve Length", description: "Shoulder to wrist.",
    instructions: "With your arm slightly bent, measure from the edge of your shoulder, over a slightly bent elbow, down to your wrist bone.",
    commonMistakes: "Measuring with the arm fully straight, which usually shortens the result.",
    illustration: measureImg("measure-sleeve"), unit: "cm", required: true, garments: ["top", "set", "agbada"], sortOrder: 3, minCm: 50, maxCm: 75,
  },
  {
    key: "bicep", label: "Bicep", description: "Widest part of the upper arm.",
    instructions: "Flex your arm slightly and wrap the tape around the fullest part of your bicep.",
    commonMistakes: "Measuring with the arm fully relaxed, which understates the true bicep width.",
    illustration: measureImg("measure-bicep"), unit: "cm", required: false, garments: ["top"], sortOrder: 4, minCm: 22, maxCm: 45,
  },
  {
    key: "armhole", label: "Armhole", description: "Arm opening circumference.",
    instructions: "Measure around the arm at the point where sleeve meets shoulder, keeping the tape close but not tight.",
    commonMistakes: "Measuring too far down the arm rather than right at the shoulder seam.",
    illustration: measureImg("measure-armhole"), unit: "cm", required: false, garments: ["top", "set", "agbada"], sortOrder: 5, minCm: 38, maxCm: 65,
  },
  {
    key: "wrist", label: "Wrist", description: "Wrist circumference.",
    instructions: "Wrap the tape around your wrist bone, where a cuff would naturally sit.",
    commonMistakes: "Measuring above the wrist bone on the forearm instead of at the bone itself.",
    illustration: measureImg("measure-wrist"), unit: "cm", required: false, garments: ["top", "set", "agbada"], sortOrder: 6, minCm: 14, maxCm: 24,
  },
  {
    key: "length", label: "Garment Length", description: "Desired overall length.",
    instructions: "Measure from the base of the back of your neck straight down to where you'd like the garment to end.",
    commonMistakes: "Measuring from the shoulder instead of the base of the neck, which shortens the result.",
    illustration: measureImg("measure-length"), unit: "cm", required: true, garments: ["top", "set", "agbada"], sortOrder: 7, minCm: 65, maxCm: 145,
  },
  {
    key: "waist", label: "Waist", description: "Natural waistline.",
    instructions: "Measure around your natural waistline, where your torso bends side to side — usually just above your navel.",
    commonMistakes: "Measuring at the hip instead of the natural waist, or pulling the tape in too tight.",
    illustration: measureImg("measure-waist"), unit: "cm", required: true, garments: ["trouser", "set"], sortOrder: 8, minCm: 60, maxCm: 140,
  },
  {
    key: "hip", label: "Hip", description: "Hip circumference.",
    instructions: "Measure around the fullest part of your hips and seat, about 20cm below your waist.",
    commonMistakes: "Measuring too high, above the fullest point of the seat.",
    illustration: measureImg("measure-hip"), unit: "cm", required: true, garments: ["trouser", "set"], sortOrder: 9, minCm: 75, maxCm: 150,
  },
  {
    key: "thigh", label: "Thigh", description: "Widest part of the thigh.",
    instructions: "Stand naturally and measure around the fullest part of one thigh, just below the seat.",
    commonMistakes: "Measuring with legs together, which can compress the true measurement.",
    illustration: measureImg("measure-thigh"), unit: "cm", required: false, garments: ["trouser", "set"], sortOrder: 10, minCm: 40, maxCm: 85,
  },
  {
    key: "knee", label: "Knee", description: "Knee circumference.",
    instructions: "Measure around your knee at its centre, standing with your leg straight.",
    commonMistakes: "Measuring with the knee bent, which changes the circumference.",
    illustration: measureImg("measure-knee"), unit: "cm", required: false, garments: ["trouser", "set"], sortOrder: 11, minCm: 28, maxCm: 55,
  },
  {
    key: "inseam", label: "Inseam", description: "Crotch seam to ankle.",
    instructions: "Measure from your crotch seam straight down the inside of your leg to your ankle bone.",
    commonMistakes: "Measuring down the outside of the leg instead of the inside.",
    illustration: measureImg("measure-inseam"), unit: "cm", required: true, garments: ["trouser", "set"], sortOrder: 12, minCm: 60, maxCm: 100,
  },
  {
    key: "outseam", label: "Outseam", description: "Waist to ankle, outer leg.",
    instructions: "Measure from your natural waist down the outside of your leg to your ankle bone.",
    commonMistakes: "Starting from the hip instead of the natural waistline.",
    illustration: measureImg("measure-outseam"), unit: "cm", required: false, garments: ["trouser", "set"], sortOrder: 13, minCm: 90, maxCm: 130,
  },
  {
    key: "trouserLength", label: "Trouser Length", description: "Desired finished length.",
    instructions: "With shoes on, measure from where the waistband sits down to your preferred hem — full break, slight break, or cropped.",
    commonMistakes: "Measuring without shoes, which usually shortens the finished hem.",
    illustration: measureImg("measure-trouserlength"), unit: "cm", required: false, garments: ["trouser", "set"], sortOrder: 14, minCm: 85, maxCm: 125,
  },
  {
    key: "height", label: "Height", description: "Standing height.",
    instructions: "Stand flat against a wall without shoes and measure from the floor to the top of your head.",
    commonMistakes: "Measuring with shoes on, or with your head tilted.",
    illustration: measureImg("measure-height"), unit: "cm", required: true, garments: ["top", "trouser", "set", "agbada"], sortOrder: 15, minCm: 145, maxCm: 210,
  },
];

export const measurementFieldMeta: Record<
  string,
  { label: string; blurb: string; garments: Array<Product["garment"]> }
> = Object.fromEntries(
  measurementFieldDefs.map((f) => [f.key, { label: f.label, blurb: f.instructions ?? "", garments: f.garments }])
);

export function fieldsForGarment(garment: Product["garment"]) {
  return measurementFieldDefs
    .filter((f) => f.garments.includes(garment))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => f.key);
}
