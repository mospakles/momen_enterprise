// The canonical order timeline and how an order is classified — shared by
// the storefront's order tracking and the admin, so they never drift apart.

import type { CartItem, OrderStage } from "./types";
import { isMadeToMeasure as productIsMadeToMeasure } from "./product-utils";

export const ORDER_STAGES: OrderStage[] = [
  "Order Placed",
  "Payment Confirmed",
  "Customization Review",
  "Awaiting Measurements",
  "Measurements Confirmed",
  "Production Queue",
  "In Production",
  "Quality Check",
  "Ready for Dispatch",
  "Shipped",
  "Delivered",
];

/** Whether any item in the order goes beyond the standard configured
 * options — uploaded reference images and/or written special instructions —
 * and therefore needs the admin's Customization Review / approval workflow
 * (Section 9), rather than going straight to production untouched. */
export function isCustomOrder(items: CartItem[]): boolean {
  return items.some((i) => (i.customOrder?.referenceImages?.length ?? 0) > 0 || Boolean(i.customOrder?.specialInstructions));
}

function isMadeToMeasure(items: CartItem[]): boolean {
  return items.some((i) => productIsMadeToMeasure(i.product));
}

export type OrderTypeLabel = "Ready-to-Wear" | "Made-to-Measure" | "Custom" | "Accessory";

/** The single dominant classification admins filter orders by (Section 9 /
 * Section 22). An order that includes any genuine custom order content is
 * always classified "Custom" regardless of what else is in the bag — that's
 * the composition that needs review before production. An order made up
 * entirely of accessories is "Accessory"; otherwise it follows whether any
 * item is made-to-measure. */
export function orderType(items: CartItem[]): OrderTypeLabel {
  if (isCustomOrder(items)) return "Custom";
  if (items.length > 0 && items.every((i) => i.product.productType === "accessory")) return "Accessory";
  if (isMadeToMeasure(items)) return "Made-to-Measure";
  return "Ready-to-Wear";
}
