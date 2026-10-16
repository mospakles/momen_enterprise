import type React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA — every editorial image slot on the site, in one place.
//
// All photographs are momen. brand imagery curated in brand/curation.json and
// served from public/images/brand. `pos` / `posMobile` are CSS object-position
// focal points so faces and garments stay in frame when a landscape photo
// fills a tall slot (or vice versa). See brand/CURATION.md for the reasoning.
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaSlot {
  src: string;
  alt: string;
  /** Focal point on desktop (CSS object-position). */
  pos?: string;
  /** Focal point on phones, when it differs. */
  posMobile?: string;
}

/** momen. brand photography (optimised copies in public/images/brand). */
const b = (name: string) => `/images/brand/${name}.jpg`;

/** Optional hero film. Muted, looping, ~6–10s, ≤ 4MB, H.264 MP4. Leave
 * undefined to use the still `hero` image (which is also the poster). */
export const HERO_VIDEO: string | undefined = undefined;

/** Style + class for a slot's focal point (desktop vs mobile). */
export function focal(slot: Pick<MediaSlot, "pos" | "posMobile">) {
  return {
    className: "[object-position:var(--pos-m)] lg:[object-position:var(--pos-d)]",
    style: { "--pos-d": slot.pos ?? "50% 50%", "--pos-m": slot.posMobile ?? slot.pos ?? "50% 50%" } as React.CSSProperties,
  };
}

export const MEDIA = {
  // A-grade: wide courtyard with open stone on the left for the headline; the
  // gold agbada is the most striking garment in the set.
  hero: {
    src: b("hero-gold-agbada-courtyard"),
    alt: "A man in a gold agbada and cap stands in a sunlit stone courtyard",
    pos: "60% 45%",
    posMobile: "67% 40%",
  },
  story: [
    { src: b("atelier-designer-sewing-ivory"), alt: "A designer sews ivory cloth at her machine, folded fabric and shears on the table", pos: "50% 40%" },
    { src: b("atelier-tailor-embroidering-cream-kaftan"), alt: "A tailor sews an embroidered cream kaftan at his machine", pos: "55% 40%" },
    { src: b("kaftan-embroidered-beige"), alt: "A man in a beige kaftan with embroidered placket and trousers", pos: "50% 30%" },
    { src: b("agbada-onyx"), alt: "A man in a black agbada with tonal embroidery and black cap", pos: "50% 25%" },
  ],
  process: [
    { src: b("bespoke-fitting-ivory-kaftan-wide"), alt: "A tailor measures a client's sleeve during a kaftan fitting", pos: "64% 40%" },
    { src: b("atelier-cutting-asooke-and-navy"), alt: "A tailor cuts navy cloth with shears at the pattern table", pos: "60% 45%" },
    { src: b("atelier-tailor-sewing-emerald"), alt: "A tailor sews emerald cloth at a sewing machine", pos: "45% 50%" },
    { src: b("brand-woven-label"), alt: "A woven momen. clothing label stitched into a finished garment", pos: "50% 45%" },
  ],
  // Mixed orientations for an asymmetric spread: wide, tall, tall, wide, tall.
  looks: [
    { src: b("campaign-trio-onyx-beige-white"), alt: "Three men in black, beige and white momen. pieces in a stone hall", pos: "66% 40%", posMobile: "64% 40%" },
    { src: b("agbada-emerald-beige"), alt: "A man in an emerald agbada with tonal embroidery and cap", pos: "50% 25%" },
    { src: b("asooke-wide-leg-indigo"), alt: "A man in a navy tee and indigo-striped aso-oke wide-leg trousers", pos: "50% 30%" },
    { src: b("campaign-linen-couple"), alt: "A man and a woman in mocha and stone linen sets in a sunlit hall", pos: "78% 40%", posMobile: "80% 40%" },
    { src: b("kaftan-geometric-white"), alt: "A man in a white kaftan with a geometric print panel and cuffs", pos: "50% 25%" },
  ],
  occasions: {
    wedding: { src: b("campaign-ivory-kaftan-white-agbada"), alt: "Two men in an ivory kaftan and a white agbada in a sunlit courtyard", pos: "76% 45%" },
    owambe: { src: b("agbada-burgundy"), alt: "A man in a burgundy agbada with embroidery and cap", pos: "50% 25%" },
    office: { src: b("campaign-trio-grey-beige-olive"), alt: "Three men in grey, beige and olive momen. pieces beside stone columns", pos: "70% 45%" },
    weekend: { src: b("linen-short-set-sage"), alt: "A man in a sage linen camp-collar shirt and shorts", pos: "50% 30%" },
    bespoke: { src: b("atelier-wide-negative-space"), alt: "Tailors at work at the far end of a long sunlit atelier", pos: "78% 50%" },
  },
  bespoke: {
    src: b("hero-bespoke-fitting-warm-light"),
    alt: "A tailor measures a client's shoulders in an ivory kaftan in warm light",
    pos: "58% 40%",
  },
  handoff: {
    src: b("campaign-trio-with-ankara"),
    alt: "Two men and a woman in linen, ankara wide-leg trousers and a navy kaftan",
    pos: "62% 40%",
  },

  // ── Inner pages ────────────────────────────────────────────────────────────
  shopHero: { src: b("hero-emerald-agbada-courtyard"), alt: "A man in an emerald agbada walks through a sunlit stone courtyard", pos: "84% 40%", posMobile: "87% 35%" },
  aboutHero: { src: b("campaign-ivory-kaftan-chocolate-agbada"), alt: "Two men in an ivory kaftan and a chocolate agbada in a sunlit colonnade", pos: "74% 40%", posMobile: "76% 35%" },
  aboutFounder: { src: b("founder-portrait-laughing-studio"), alt: "Motunrayo Odusina, founder of momen., laughing in a black and magenta printed one-shoulder peplum dress", pos: "55% 30%" },
  aboutFounderDetails: [
    { src: b("founder-portrait-hands-on-heart"), alt: "Motunrayo Odusina, hands on heart, in a black and magenta printed peplum dress and gold rings", pos: "50% 24%" },
    { src: b("atelier-tailor-sewing-cocoa"), alt: "A tailor sews cocoa cloth, tape and shears at hand", pos: "50% 40%" },
  ],
  aboutAtelier: { src: b("atelier-tailors-at-work-wide"), alt: "Tailors at work at their machines in the momen. atelier", pos: "52% 50%" },
  madeToMeasureHero: { src: b("hero-bespoke-fitting-warm-light"), alt: "A tailor measures a client's shoulders in an ivory kaftan in warm light", pos: "58% 35%", posMobile: "60% 35%" },
  shopFeatures: {
    wedding: { src: b("campaign-ivory-kaftan-white-agbada"), alt: "Two men in an ivory kaftan and a white agbada in a sunlit courtyard", pos: "74% 40%" },
    cloth: { src: b("atelier-cutting-asooke-and-navy"), alt: "Two tailors measure aso-oke and cut navy cloth at a pattern table", pos: "40% 50%" },
    bespoke: { src: b("bespoke-fitting-ivory-kaftan-wide"), alt: "A tailor measures a client during a kaftan fitting", pos: "62% 40%" },
    accessories: { src: b("accessories-still-life"), alt: "Fila caps, loafers, a crossbody bag, watch, sunglasses and belt on stone", pos: "78% 50%" },
  },
  emptyBag: { src: b("camp-collar-set-ivory-alt"), alt: "A man in an off-white camp-collar shirt and trousers", pos: "50% 25%" },
  footer: { src: b("brand-hang-tag-white-garment"), alt: "A black momen. hang tag on a folded white garment", pos: "50% 50%" },
  auth: {
    login: { src: b("agbada-navy"), alt: "A man in a navy agbada with tonal embroidery and cap", pos: "50% 25%" },
    signup: { src: b("jalabia-ceremonial-cream-gold"), alt: "A man in a cream jalabia with gold embroidery and cap", pos: "50% 25%" },
    recover: { src: b("brand-woven-label"), alt: "A woven momen. clothing label stitched into a garment", pos: "50% 45%" },
  },
} satisfies Record<string, unknown>;

/** Lookbook pairing: each editorial image links to a real product. Edit the
 * slugs to curate; when a slug isn't published, the lookbook falls back to the
 * next signature/featured product from the catalogue. */
export const LOOK_PRODUCT_SLUGS = [
  "tunde-classic-kaftan",
  "adebayo-signature-agbada",
  "seun-aso-oke-wide-leg-trouser",
  "victoria-island-camp-collar-set",
  "dayo-geometric-panel-kaftan",
];
