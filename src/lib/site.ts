// Site-wide constants and server-side catalogue reads for metadata, the
// sitemap and structured data. The storefront itself loads data in the
// browser; these helpers exist so crawlers and link previews (WhatsApp,
// Instagram, Google) see real titles, descriptions and photos.

import { cache } from "react";
import type { Collection, Product } from "./types";
import { campaignHero } from "./campaign-images";
import { withStorefrontCollectionCover, withStorefrontImages } from "./brand-images";

/** Public address of the storefront, e.g. https://momenclothing.com. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://momenclothing.com").replace(/\/$/, "");
export const SITE_NAME = "momen.";
export const DEFAULT_DESCRIPTION =
  "Nigerian ready-to-wear and bespoke in Lagos. Ankara pants, aso-oke patchwork, jalabia, two-piece sets, vintage shirts, linen tees and fila.";
export const DEFAULT_OG_IMAGE = campaignHero.src;

// Prefer the private API address for server-side catalogue reads when set.
const API = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

/** `missing` is true only when the API answered 404, never on network
 * errors, so a brief outage can't turn a real page into a 404. */
async function fetchJson<T>(path: string, revalidate = 300): Promise<{ data: T | null; missing: boolean }> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(4000) });
    if (res.status === 404) return { data: null, missing: true };
    if (!res.ok) return { data: null, missing: false };
    return { data: (await res.json()) as T, missing: false };
  } catch {
    // Never fail a page because metadata couldn't be fetched.
    return { data: null, missing: false };
  }
}
async function getJson<T>(path: string, revalidate = 300): Promise<T | null> {
  return (await fetchJson<T>(path, revalidate)).data;
}

export const getProductResult = cache(async (slug: string) => {
  const result = await fetchJson<Product>(`/products/${encodeURIComponent(slug)}`);
  return { ...result, data: result.data && withStorefrontImages(result.data) };
});
export const getProduct = cache(async (slug: string) => (await getProductResult(slug)).data);
export const getCmsPageResult = cache((slug: string) => fetchJson<{ title: string; body?: string; seo?: { title?: string; description?: string } }>(`/pages/${encodeURIComponent(slug)}`));

export const getAllProducts = cache(async () => {
  const data = await getJson<Product[] | { items: Product[] }>("/products?pageSize=1000", 900);
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
});

export const getCollections = cache(async () =>
  ((await getJson<Collection[]>("/collections", 900)) ?? []).map(withStorefrontCollectionCover),
);

/** Absolute URL for an image path that may be site-relative. */
export function absoluteUrl(path?: string) {
  if (!path) return `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function plainText(text: string | undefined, max = 160) {
  const clean = (text ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
