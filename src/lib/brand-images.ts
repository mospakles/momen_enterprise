// Brand photography helpers. Paths from before the curation pass resolve to
// their new names (so older database rows keep working), and every served
// photo gets a blurred colour placeholder while it loads.

import { BRAND_IMAGES, LEGACY_BRAND_PATHS } from "./brand-images.generated";
import type { CartItem, Product } from "./types";

/** Current served path for an image (legacy names are mapped forward). */
export function resolveImage<T extends string | undefined>(src: T): T {
  if (!src) return src;
  return (LEGACY_BRAND_PATHS[src] ?? src) as T;
}

const cache = new Map<string, `data:image/svg+xml;base64,${string}` | undefined>();

/** A soft, blurred 2×3 colour field matching the photo — for next/image's
 * `placeholder` prop. Undefined for images outside the brand library. */
export function placeholderFor(src: string | undefined) {
  if (!src) return undefined;
  const key = resolveImage(src);
  if (cache.has(key)) return cache.get(key);
  const entry = BRAND_IMAGES[key];
  let value: `data:image/svg+xml;base64,${string}` | undefined;
  if (entry) {
    const c = entry.ph.match(/.{6}/g) ?? [];
    const rects = c.map((hex, i) => `<rect x="${i % 2}" y="${Math.floor(i / 2)}" width="1" height="1" fill="#${hex}"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 3" preserveAspectRatio="none"><filter id="b"><feGaussianBlur stdDeviation=".55"/></filter><g filter="url(#b)">${rects}</g></svg>`;
    value = `data:image/svg+xml;base64,${typeof window === "undefined" ? Buffer.from(svg).toString("base64") : btoa(svg)}`;
  }
  cache.set(key, value);
  return value;
}

/** A product with every brand photo path mapped to its current name.
 * Tolerates the slim product copies on orders (no colours, sometimes no images). */
export function withCurrentImages(p: Product): Product {
  return {
    ...p,
    images: p.images?.map((src) => resolveImage(src)) ?? p.images,
    hoverImage: resolveImage(p.hoverImage),
    colors: p.colors?.map((c) => (c.images ? { ...c, images: c.images.map((src) => resolveImage(src)) } : c)) ?? p.colors,
  };
}

/** Bag items carry their own product copy (from storage or the saved cart). */
export const withCurrentItemImages = (items: CartItem[]) => (items ?? []).map((i) => (i.product ? { ...i, product: withCurrentImages(i.product) } : i));
