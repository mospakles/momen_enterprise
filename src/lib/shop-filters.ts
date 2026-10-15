// Catalogue filtering for /shop. The URL is the single source of truth, so
// filters survive back/forward navigation and can be shared as links.

import type { Category, Product } from "./types";
import { findOccasion } from "./occasions";
import { searchProducts, normalise } from "./search";
import { inCategory, stockState } from "./product-utils";

export interface ShopQuery {
  q: string;
  occasion: string;
  category: string[];
  fabric: string[];
  color: string[];
  size: string[];
  gender: string[];
  availability: string[];
  maxPrice: number | null;
  sort: SortKey;
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price, low to high" },
  { key: "price-desc", label: "Price, high to low" },
];

/** Cloth vocabulary matched against each product's own copy, since the
 * structured `fabric` field is often empty. */
export const FABRICS = ["Aso-oke", "Brocade", "Linen", "Cotton", "Ankara", "Lace", "Silk", "Wool", "Leather", "Raffia", "Kente", "George"];

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

export function parseQuery(params: URLSearchParams): ShopQuery {
  const max = Number(params.get("max"));
  const sort = params.get("sort") as SortKey | null;
  return {
    q: params.get("q") ?? "",
    occasion: params.get("occasion") ?? "",
    category: list(params.get("category")),
    fabric: list(params.get("fabric")),
    color: list(params.get("color")),
    size: list(params.get("size")),
    gender: list(params.get("gender")),
    availability: list(params.get("availability")),
    maxPrice: Number.isFinite(max) && max > 0 ? max : null,
    sort: sort && SORTS.some((s) => s.key === sort) ? sort : "featured",
  };
}

export function serializeQuery(q: ShopQuery) {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.occasion) p.set("occasion", q.occasion);
  (["category", "fabric", "color", "size", "gender", "availability"] as const).forEach((k) => q[k].length && p.set(k, q[k].join(",")));
  if (q.maxPrice) p.set("max", String(q.maxPrice));
  if (q.sort !== "featured") p.set("sort", q.sort);
  return p.toString();
}

export function productFabrics(p: Product) {
  const text = normalise([p.name, p.fabric, p.shortDescription, p.description, p.tags.join(" ")].join(" "));
  return FABRICS.filter((f) => text.includes(normalise(f)));
}

/** A category filter value is a slug; a parent category (e.g. accessories)
 * expands to its children. */
function categoryMatches(p: Product, slugs: string[], categories: Category[]) {
  if (!slugs.length) return true;
  return slugs.some((slug) => {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) return p.category.toLowerCase() === slug;
    const children = categories.filter((c) => c.parentId === cat.id);
    return children.length ? children.some((child) => inCategory(p, child)) || inCategory(p, cat) : inCategory(p, cat);
  });
}

export function applyQuery(products: Product[], q: ShopQuery, categories: Category[]) {
  const occasion = findOccasion(q.occasion);
  let result = q.q ? searchProducts(products, q.q) : products.filter((p) => p.publishStatus === "published");
  result = result.filter((p) => {
    if (occasion?.matches && !occasion.matches(p)) return false;
    if (!categoryMatches(p, q.category, categories)) return false;
    if (q.fabric.length && !productFabrics(p).some((f) => q.fabric.includes(f))) return false;
    if (q.color.length && !p.colors.some((c) => q.color.includes(c.name))) return false;
    if (q.size.length && !p.sizes.some((s) => q.size.includes(s))) return false;
    if (q.gender.length && !q.gender.includes(p.gender)) return false;
    if (q.maxPrice && p.price > q.maxPrice) return false;
    if (q.availability.length) {
      const state = stockState(p);
      const bucket = state === "made-to-order" || p.customizable ? "made-to-order" : state === "sold-out" ? "sold-out" : "in-stock";
      if (!q.availability.includes(bucket)) return false;
    }
    return true;
  });
  if (q.q && q.sort === "featured") return result; // keep relevance order for searches
  const sorted = [...result];
  if (q.sort === "newest") sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.createdAt.localeCompare(a.createdAt));
  if (q.sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
  if (q.sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
  if (q.sort === "featured") sorted.sort((a, b) => Number(b.isSignature) - Number(a.isSignature) || Number(b.isFeatured) - Number(a.isFeatured));
  return sorted;
}

/** Options for the drawer, drawn from what's actually published. */
export function facets(products: Product[]) {
  const published = products.filter((p) => p.publishStatus === "published");
  const colors = new Map<string, string>();
  const sizes = new Set<string>();
  const fabrics = new Set<string>();
  let maxPrice = 0;
  for (const p of published) {
    p.colors.forEach((c) => colors.set(c.name, c.hex));
    p.sizes.forEach((s) => sizes.add(s));
    productFabrics(p).forEach((f) => fabrics.add(f));
    maxPrice = Math.max(maxPrice, p.price);
  }
  const letterOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const sortedSizes = [...sizes].sort((a, b) => {
    const ia = letterOrder.indexOf(a), ib = letterOrder.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return (Number(a) || 999) - (Number(b) || 999) || a.localeCompare(b);
  });
  return {
    colors: [...colors].map(([name, hex]) => ({ name, hex })),
    sizes: sortedSizes,
    fabrics: FABRICS.filter((f) => fabrics.has(f)),
    maxPrice: Math.ceil(maxPrice / 10000) * 10000,
  };
}

export function activeCount(q: ShopQuery) {
  return q.category.length + q.fabric.length + q.color.length + q.size.length + q.gender.length + q.availability.length + (q.occasion ? 1 : 0) + (q.maxPrice ? 1 : 0);
}
