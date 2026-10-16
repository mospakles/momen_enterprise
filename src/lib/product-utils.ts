// Tolerant readers for product enums. The API serialises some enums with
// underscores ("made_to_measure", "one_size") while the frontend types use
// hyphens ("made-to-measure"); these helpers accept both.

import type { CartItem, Product } from "./types";

const norm = (value: string | undefined) => (value ?? "").replace(/_/g, "-");

/** Sizing mode with hyphens ("made-to-measure", "both", "one-size", "standard"). */
export const sizingModeOf = (p: Product) => norm(p.sizingMode);
export const isMadeToMeasure = (p: Product) => norm(p.productionType) === "made-to-measure";
export const isAccessory = (p: Product) => norm(p.productType) === "accessory";
export const isOneSize = (p: Product) => norm(p.sizingMode) === "one-size" || p.sizes.length <= 1;
/** A bag item that can't go to payment until measurements are added: only a
 * made-to-measure piece the customer chose to have cut to their measurements.
 * A standard size picked from the size guide goes straight through. */
export function needsMeasurements(item: CartItem) {
  if (!isMadeToMeasure(item.product)) return false;
  if (item.measurement && item.measurement.mode !== "pending") return false;
  if (item.customOrder) return item.size === "Made-to-Measure";
  return item.fit === "measure";
}

export const offersMadeToMeasure = (p: Product) => ["made-to-measure", "both"].includes(norm(p.sizingMode)) || isMadeToMeasure(p);

/** Category comparison that works whether `product.category` holds the slug
 * (API) or the display name (legacy data). */
export function inCategory(p: Product, category: { slug: string; name: string }) {
  const c = p.category.toLowerCase();
  return c === category.slug.toLowerCase() || c === category.name.toLowerCase();
}

export type StockState = "in-stock" | "low-stock" | "made-to-order" | "sold-out";

export function stockState(p: Product): StockState {
  const s = norm(p.stock);
  if (s === "out-of-stock") return "sold-out";
  if (s === "made-to-order") return "made-to-order";
  const available = p.stockQuantity - (p.reservedQuantity ?? 0);
  if (!isMadeToMeasure(p) && p.stockQuantity > 0 && available <= 0) return "sold-out";
  if (s === "low-stock" || (p.lowStockThreshold > 0 && available > 0 && available <= p.lowStockThreshold)) return "low-stock";
  return "in-stock";
}

export function availableUnits(p: Product) {
  return Math.max(0, p.stockQuantity - (p.reservedQuantity ?? 0));
}
