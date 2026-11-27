export {
  bespoke, bespokeSlug, campaignPhoto, campaignPrice, campaignRange, campaignSizes, findCampaignStyle, offeredColours, readyToWear,
  type CampaignColour, type CampaignStyle,
} from "./campaign-range";

import { bespokeSlug, campaignPhoto, type CampaignStyle } from "./campaign-range";
import type { Product } from "./types";
import { effectivePrice } from "./product-utils";
import { normalise } from "./search";

export function matchesCampaignStyle(style: CampaignStyle, query: string) {
  const terms = normalise(query)
    .replace(/\basooke\b/g, "aso oke")
    .replace(/\b2\b/g, "two")
    .replace(/\btrousers?\b/g, "pants")
    .split(/\s+/).filter(Boolean);
  const searchable = normalise([style.name, style.description, ...style.colours.map((colour) => colour.name)].join(" "));
  return terms.every((term) => searchable.includes(term));
}

export function campaignProductSlug(style: CampaignStyle, madeToMeasure = false) {
  return madeToMeasure ? bespokeSlug(style) : style.slug;
}

export function findCampaignProduct(products: readonly Product[], slug: string) {
  return products.find((product) =>
    product.slug === slug && product.publishStatus === "published" && effectivePrice(product) > 0,
  );
}

export const campaignCollections = [
  { slug: "ready-to-wear", name: "Ready-to-Wear", href: "/shop", image: campaignPhoto("cobalt-trousers-duo-side"), description: "Ankara pants, aso-oke patchwork, jalabia, two-piece sets, vintage shirts, linen tees and fila." },
  { slug: "bespoke", name: "Bespoke", href: "/made-to-measure", image: campaignPhoto("blue-geometric-set-seated"), description: "Agbada, senator, kaftans, jalabia and two-piece sets made to your measurements." },
] as const;
