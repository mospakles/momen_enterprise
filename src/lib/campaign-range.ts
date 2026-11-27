export interface CampaignColour {
  name: string;
  hex: string;
  photos: readonly [string, ...string[]];
  /** Shown with an AI style illustration, not a campaign photograph. These
   * images stay out of the lookbook. */
  illustration?: boolean;
}

export interface CampaignStyle {
  slug: string;
  name: string;
  description: string;
  garment: "top" | "trouser" | "set" | "agbada" | "accessory";
  collection?: "casuals";
  readyToWear: boolean;
  bespoke: boolean;
  readyPrice?: number;
  bespokeStartingPrice?: number;
  colours: readonly [CampaignColour, ...CampaignColour[]];
}

export const campaignPhoto = (name: string) => `/images/campaign/${name}.webp`;

const garmentSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
const filaSizes = ["21", "21.5", "22", "22.5", "23", "23.5", "24", "24.5", "25", "25.5", "26"] as const;

export function campaignSizes(style: CampaignStyle, madeToMeasure = false): readonly string[] {
  if (style.slug === "fila") return filaSizes;
  return style.readyToWear && !madeToMeasure ? garmentSizes : [];
}

// Group shots from the lookbook that show the Ankara pants together; every
// Ankara colourway's gallery includes them.
const ankaraGroupShots = [
  "patterned-trousers-trio", "cobalt-trousers-duo-front", "cobalt-trousers-duo-side",
  "patterned-trousers-group-front", "patterned-trousers-group-side",
] as const;

/** Style illustrations (public/images/campaign/illustrations) gathered into
 * one "your choice of fabric" option, so a style is one card with many looks. */
const illustrated = (name: string, hex: string, ...photos: [string, ...string[]]): CampaignColour =>
  ({ name, hex, photos: photos.map((photo) => `illustrations/${photo}`) as [string, ...string[]], illustration: true });
const LOOKS = "Your choice of fabric";

export const campaignRange: readonly CampaignStyle[] = [
  {
    slug: "ankara-pants", name: "Ankara Pants", garment: "trouser", readyToWear: true, bespoke: false, readyPrice: 25000,
    description: "Geometric Ankara prints with contrasting cuffs and side panels. Explore three different treatments in the campaign gallery.",
    colours: [
      { name: "Cobalt and stripe", hex: "#25388b", photos: ["cobalt-striped-cuff-trousers-front", "cobalt-striped-cuff-trousers-side", "cobalt-striped-cuff-trousers-styled", "cobalt-striped-cuff-trousers-detail", ...ankaraGroupShots] },
      { name: "Cobalt and tan", hex: "#bca17b", photos: ["cobalt-tan-cuff-trousers-side", "cobalt-tan-cuff-trousers-motion", "cobalt-tan-cuff-trousers-styled", "cobalt-tan-cuff-trousers-back", ...ankaraGroupShots] },
      { name: "Black and burgundy", hex: "#50202c", photos: ["black-geometric-trousers-front", "black-geometric-trousers-side", "black-geometric-trousers-angle", "black-geometric-trousers-side-detail", ...ankaraGroupShots] },
      illustrated("Kente cargo", "#b5651d", "ankara-cargo-kente"),
    ],
  },
  {
    slug: "aso-oke-patchwork-pants", name: "Aso-oke Patchwork Pants", garment: "trouser", readyToWear: true, bespoke: false, readyPrice: 35000,
    description: "Colourful patches of woven aso-oke come together in a single pair of trousers. See how the panels change from front to back.",
    colours: [{ name: "Multicolour", hex: "#ab553c", photos: ["patchwork-trousers-full-length", "patchwork-trousers-detail", "patchwork-trousers-back", "patchwork-trousers-studio", "patchwork-trousers-profile", "patchwork-trousers-studio-light"] }],
  },
  {
    slug: "agbada", name: "Agbada", garment: "agbada", readyToWear: false, bespoke: true, bespokeStartingPrice: 150000,
    description: "The full three-piece agbada: a wide, flowing outer robe over a fitted inner top and trousers, with embroidery at the neck. Made to your measurements in your choice of fabric.",
    colours: [
      illustrated(LOOKS, "#6e1f2c",
        "agbada-burgundy-studio", "agbada-emerald-beige", "agbada-ivory-gold", "agbada-navy",
        "agbada-onyx", "agbada-pearl", "agbada-white-tonal"),
    ],
  },
  {
    slug: "kaftan", name: "Kaftan", garment: "set", readyToWear: false, bespoke: true, bespokeStartingPrice: 80000,
    description: "A sky-blue kaftan and matching trousers with a geometric accent at the placket and pocket. Available through Bespoke.",
    colours: [{ name: "Sky blue", hex: "#46a3e2", photos: ["blue-geometric-set-full-length", "blue-geometric-set-seated", "blue-geometric-set-front", "blue-geometric-set-portrait", "blue-geometric-set-seated-wide"] }],
  },
  {
    slug: "kaftan-senator", name: "Kaftan & Senator", garment: "set", readyToWear: false, bespoke: true, bespokeStartingPrice: 80000,
    description: "A long kaftan or a tailored senator top with matching trousers, plain or with embroidery down the front. Made to your measurements in your choice of fabric.",
    colours: [
      illustrated(LOOKS, "#24493a",
        "kaftan-embroidered-forest", "senator-charcoal", "kaftan-sand", "senator-white",
        "kaftan-onyx-cap", "kaftan-white-pocket-square"),
    ],
  },
  {
    slug: "jalabia", name: "Jalabia", garment: "top", readyToWear: true, bespoke: true, readyPrice: 40000,
    description: "A full-length burgundy jalabia with tonal geometric detailing across the front.",
    colours: [{ name: "Burgundy", hex: "#681e41", photos: ["burgundy-robe-front", "burgundy-robe-detail", "burgundy-robe-back", "burgundy-robe-studio", "burgundy-robe-full-length"] }],
  },
  {
    slug: "two-piece", name: "Two-Piece Set", garment: "set", readyToWear: true, bespoke: true, readyPrice: 40000,
    description: "A textured ivory polo and matching trousers, designed to be worn together.",
    colours: [{ name: "Ivory", hex: "#e5ddc6", photos: ["ivory-textured-set-front", "ivory-textured-set-side", "ivory-textured-polo-detail", "ivory-textured-polo-back", "ivory-textured-set-portrait"] }],
  },
  {
    slug: "linen-two-piece-shorts", name: "Linen Two-Piece Shorts", garment: "set", collection: "casuals", readyToWear: true, bespoke: false, readyPrice: 40000,
    description: "A casual linen shirt and shorts set with matching and contrasting colour combinations.",
    colours: [
      illustrated("Style references", "#a97768",
        "linen-short-set-rose", "linen-shirt-ivory-navy-shorts", "linen-short-set-sage",
        "linen-shirt-rose-navy-shorts", "twopiece-short-white", "linen-short-set-midnight",
        "linen-shirt-sand-navy-shorts", "linen-short-set-mocha", "linen-shirt-midnight-ivory-shorts"),
    ],
  },
  {
    slug: "linen-two-piece-alternating-colours", name: "Linen Two-Piece · Alternating Colours", garment: "set", collection: "casuals", readyToWear: true, bespoke: false, readyPrice: 40000,
    description: "A casual linen shirt and full-length trousers in two different colours.",
    colours: [
      illustrated("Style references", "#858d79",
        "linen-shirt-sage-ivory-trousers", "linen-shirt-terracotta-ivory-trousers", "linen-shirt-midnight-sand-trousers",
        "linen-shirt-ivory-mocha-trousers", "linen-shirt-rose-charcoal-trousers", "twopiece-long-olive"),
    ],
  },
  {
    slug: "linen-two-piece", name: "Linen Two-Piece · Same Colour", garment: "set", collection: "casuals", readyToWear: true, bespoke: false, readyPrice: 40000,
    description: "A casual linen shirt and full-length trousers in the same colour.",
    colours: [
      illustrated("Style references", "#d8c3a0",
        "camp-collar-set-ivory", "camp-collar-set-midnight", "camp-collar-set-mint", "camp-collar-set-mocha",
        "camp-collar-set-olive", "camp-collar-set-rose", "camp-collar-set-onyx", "twopiece-long-onyx",
        "camp-collar-set-ivory-alt", "camp-collar-set-olive-alt"),
    ],
  },
  {
    slug: "vintage-shirt", name: "Vintage Shirt", garment: "top", readyToWear: true, bespoke: false, readyPrice: 20000,
    description: "A short-sleeve shirt with a vintage-inspired print. Choose between bold blue abstraction and a green and gold landscape.",
    colours: [
      { name: "Blue abstract", hex: "#216ba3", photos: ["blue-abstract-shirt-front", "blue-abstract-shirt-side", "blue-abstract-shirt-back"] },
      { name: "Landscape", hex: "#50792e", photos: ["landscape-print-shirt-front", "landscape-print-shirt-side", "landscape-print-shirt-back"] },
    ],
  },
  {
    slug: "linen-tee-aso-oke", name: "Linen Tee with Aso-oke Detailing", garment: "top", readyToWear: true, bespoke: false, readyPrice: 25000,
    description: "An ivory linen tee with diagonal burgundy and grey aso-oke panels across the front.",
    colours: [{ name: "Ivory and burgundy", hex: "#7e354c", photos: ["ivory-woven-panel-shirt-front", "ivory-woven-panel-shirt-detail", "ivory-woven-panel-shirt-side"] }],
  },
  {
    slug: "fila", name: "Fila", garment: "accessory", readyToWear: true, bespoke: false, readyPrice: 10000,
    description: "A traditional Yoruba cap, photographed in plain and striped finishes.",
    colours: [
      { name: "Blue", hex: "#267acf", photos: ["blue-cap-detail"] },
      { name: "Black", hex: "#252423", photos: ["black-cap-profile"] },
      { name: "White", hex: "#eae7de", photos: ["white-cap-profile"] },
      { name: "Burgundy stripe", hex: "#6b3445", photos: ["burgundy-striped-cap-front", "burgundy-striped-cap-profile"] },
      illustrated("Woven aso-oke", "#c99a3a", "cap-fila-gold", "cap-fila-emerald", "cap-fila-navy"),
    ],
  },
];

export const readyToWear = campaignRange.filter((style) => style.readyToWear);
/** Keep illustrated extras off photographed Ready-to-Wear listings. Styles
 * with no campaign photography use their illustrated references instead. */
export const offeredColours = (style: CampaignStyle, madeToMeasure: boolean) =>
  madeToMeasure || style.colours.every((colour) => colour.illustration)
    ? style.colours : style.colours.filter((colour) => !colour.illustration);
export const bespoke = campaignRange.filter((style) => style.bespoke);

export const bespokeSlug = (style: CampaignStyle) => style.readyToWear ? `${style.slug}-bespoke` : style.slug;
/** The price of a style. Bespoke uses its own price where one is set,
 * otherwise the Ready-to-Wear price. */
export const campaignPrice = (style: CampaignStyle, madeToMeasure: boolean) =>
  madeToMeasure ? style.bespokeStartingPrice ?? style.readyPrice : style.readyPrice;
export const findCampaignStyle = (slug: string) =>
  campaignRange.find((style) => style.slug === slug || (style.bespoke && bespokeSlug(style) === slug));
