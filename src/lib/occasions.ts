// Occasions ("worlds") shared by the landing journey and the shop filter.
// Products don't carry an occasion field, so each occasion is defined as a
// match over data the catalogue already has: collections, categories, tags.

import type { Product } from "./types";

interface Occasion {
  slug: string;
  label: string;
  line: string;
  /** Where the occasion card routes. Most go to the filtered catalogue. */
  href: string;
  matches?: (product: Product) => boolean;
}

const inCollection = (p: Product, ...slugs: string[]) => p.collectionSlugs.some((c) => slugs.includes(c));
const inCategory = (p: Product, ...slugs: string[]) => slugs.includes(p.category.toLowerCase().replace(/\s+/g, "-"));

export const OCCASIONS: Occasion[] = [
  {
    slug: "wedding",
    label: "Wedding",
    line: "For the vows, and the photographs that outlive them.",
    href: "/shop?occasion=wedding",
    matches: (p) => inCollection(p, "occasion", "limited-edition") && inCategory(p, "agbada", "kaftans", "other-accessories", "caps"),
  },
  {
    slug: "owambe",
    label: "Owambe",
    line: "Big sleeves. Bigger entrances. Dressed for the dance floor.",
    href: "/shop?occasion=owambe",
    matches: (p) => inCollection(p, "occasion", "heritage") || inCategory(p, "agbada"),
  },
  {
    slug: "office",
    label: "Office",
    line: "Native, sharpened. Monday to Friday with intent.",
    href: "/shop?occasion=office",
    matches: (p) => inCollection(p, "everyday", "signature") && inCategory(p, "shirts", "pants", "kaftans", "belts", "bags"),
  },
  {
    slug: "weekend",
    label: "Weekend",
    line: "Linen, ease and the long Lagos afternoon.",
    href: "/shop?occasion=weekend",
    matches: (p) => inCategory(p, "casual-wear", "footwear", "caps") || inCollection(p, "contemporary"),
  },
  {
    slug: "bespoke",
    label: "Bespoke",
    line: "Cut for one. Measured, fitted, and finished by hand.",
    href: "/made-to-measure",
  },
];

export function findOccasion(slug: string | null | undefined) {
  return OCCASIONS.find((o) => o.slug === slug);
}
