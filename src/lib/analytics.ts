// Commerce analytics events (GA4 e-commerce naming). Events are pushed to
// `window.dataLayer` when a tag manager is present and always re-dispatched as
// a `momen:analytics` DOM event, so any provider can be wired in later
// without touching the call sites.

import type { Product } from "./types";

export type AnalyticsEvent =
  | "view_item"
  | "view_item_list"
  | "add_to_cart"
  | "remove_from_cart"
  | "add_to_wishlist"
  | "begin_checkout"
  | "add_shipping_info"
  | "add_payment_info"
  | "purchase"
  | "search";

export function itemFromProduct(product: Product, extra: { size?: string; color?: string; quantity?: number; price?: number } = {}) {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    item_variant: [extra.color, extra.size].filter(Boolean).join(" / ") || undefined,
    price: extra.price ?? product.price,
    quantity: extra.quantity ?? 1,
  };
}

export function track(event: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = { event, currency: "NGN", ...params };
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent("momen:analytics", { detail: payload }));
  if (process.env.NODE_ENV === "development") console.debug("[analytics]", payload);
}
