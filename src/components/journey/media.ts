// ─────────────────────────────────────────────────────────────────────────────
// MEDIA — every image and video slot in the brand journey.
//
// Most slots use momen. brand photography (public/images/brand, optimised
// from the originals in public/brand). The three slots still marked
// PLACEHOLDER (measure / cut / sew in the making strip) are Unsplash
// stand-ins until atelier photography exists; `brief` describes the shot.
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaSlot {
  src: string;
  alt: string;
  /** What real brand photography should go here. */
  brief: string;
}

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2000&q=80`;
/** momen. brand photography (optimised copies in public/images/brand). */
const b = (name: string) => `/images/brand/${name}.jpg`;

/** Optional hero film. Muted, looping, ~6–10s, ≤ 4MB, H.264 MP4. Leave
 * undefined to use the still `hero` image (which is also the poster). */
export const HERO_VIDEO: string | undefined = undefined;

export const MEDIA = {
  hero: {
    src: b("agbada8"),
    alt: "A man in a gold embroidered agbada and cap stands in window light",
    brief: "Full-length agbada in motion: sleeves catching wind, low sun, Lagos architecture. Portrait + landscape crops.",
  },
  story: [
    {
      src: b("logo"),
      alt: "A momen. clothing tag resting on folds of charcoal cloth",
      brief: "The cloth: bolts of aso-oke and brocade in the atelier, raking light across the weave.",
    },
    {
      src: b("logo1"),
      alt: "A woven momen. clothing label stitched into a brown jacket",
      brief: "The hands: a momen. tailor at work, close on hands and chalk, black and white.",
    },
    {
      src: b("kaftan8"),
      alt: "A man in a taupe kaftan with embroidered chest detail and matching trousers",
      brief: "The line: a clean modern kaftan silhouette against a plain wall.",
    },
    {
      src: b("2piecelong6"),
      alt: "A man in a black long-sleeve shirt and trousers stands composed",
      brief: "The man: candid portrait of the momen. customer, relaxed, unposed.",
    },
  ],
  process: [
    {
      src: u("1744808336885-c6b2425c3f1e"),
      alt: "A tailor with a measuring tape draped around his neck",
      brief: "PLACEHOLDER — Measure: tape across a client's shoulders during a fitting.",
    },
    {
      src: u("1631628559428-f79ca90b9ef8"),
      alt: "A tailor cuts thread with scissors over dark fabric",
      brief: "PLACEHOLDER — Cut: shears through cloth on the cutting table, chalk lines visible.",
    },
    {
      src: u("1687422808289-e721259c9eb4"),
      alt: "A tailor guides printed fabric through a black sewing machine",
      brief: "PLACEHOLDER — Sew: needle plate and fabric close-up on the machine.",
    },
    {
      src: b("logo3"),
      alt: "A momen. clothing hang tag on a finished white garment",
      brief: "Finish: hand embroidery or hand-felled hem, macro.",
    },
  ],
  looks: [
    {
      src: b("agbada7"),
      alt: "A man in a white agbada with gold embroidery and a matching cap",
      brief: "Look 01: full-length occasion look.",
    },
    {
      src: b("kaftan11"),
      alt: "A man in a navy kaftan with tonal embroidery and sunglasses",
      brief: "Look 02: embroidered kaftan.",
    },
    {
      src: b("shirt"),
      alt: "A man in a burnt-orange textured shirt and wide stone trousers",
      brief: "Look 03: shirt and wide trouser.",
    },
    {
      src: b("2pieceshort9"),
      alt: "A man in a green short-sleeve two-piece with patterned trim",
      brief: "Look 04: weekend two-piece.",
    },
    {
      src: b("menasooke5"),
      alt: "A man in a white shirt and burgundy striped aso-oke cargo trousers",
      brief: "Look 05: aso-oke trouser.",
    },
  ],
  occasions: {
    wedding: {
      src: b("agbada6"),
      alt: "A man in a white agbada with black geometric embroidery and cap",
      brief: "Wedding: groom in full occasion wear, golden hour.",
    },
    owambe: {
      src: b("agbada9"),
      alt: "A man in a burnt-orange agbada and matching cap",
      brief: "Owambe: celebration energy, agbada mid-movement.",
    },
    office: {
      src: b("kaftan7"),
      alt: "A man in an all-black kaftan and cap",
      brief: "Office: senator or native shirt in a modern workplace.",
    },
    weekend: {
      src: b("2pieceshort11"),
      alt: "A man in a teal short-sleeve two-piece and sunglasses",
      brief: "Weekend: relaxed linen and woven pieces, outdoors.",
    },
    bespoke: {
      src: b("agbada11"),
      alt: "A man in an emerald agbada with embroidered chest panel",
      brief: "Bespoke: the fitting room, tape and pins.",
    },
  },
  bespoke: {
    src: b("agbada10"),
    alt: "A man in a brown agbada with gold embroidery and cap",
    brief: "Bespoke invitation: a warm fitting-room moment, client and tailor.",
  },
  handoff: {
    src: b("agbada"),
    alt: "A man in a burgundy agbada with gold embroidery",
    brief: "Handoff: one quiet campaign image, generous negative space.",
  },
} satisfies Record<string, MediaSlot | MediaSlot[] | Record<string, MediaSlot>>;

/** Lookbook pairing: each editorial image links to a real product. Edit the
 * slugs to curate; when a slug isn't published, the lookbook falls back to the
 * next signature/featured product from the catalogue. */
export const LOOK_PRODUCT_SLUGS = [
  "adebayo-complete-agbada-set",
  "obasi-embroidered-kaftan",
  "obi-native-shirt",
  "weekend-two-piece-set",
  "femi-straight-trouser",
];
