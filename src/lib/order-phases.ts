// The customer-facing view of an order's progress: the eleven internal
// production stages collapse into four phases a customer cares about.

import type { Order, OrderStage } from "./types";

export const PHASES = ["Confirmed", "In production", "Shipped", "Delivered"] as const;

const PHASE_OF: Record<OrderStage, number> = {
  "Order Placed": 0,
  "Payment Confirmed": 0,
  "Customization Review": 0,
  "Awaiting Measurements": 0,
  "Measurements Confirmed": 0,
  "Production Queue": 1,
  "In Production": 1,
  "Quality Check": 1,
  "Ready for Dispatch": 2,
  Shipped: 2,
  Delivered: 3,
};

const EXCEPTIONS = ["Payment Failed", "Cancelled", "Refund Requested", "Refunded", "Partially Refunded", "On Hold", "Awaiting Customer Response"];

/** Index of the phase reached (0–3), plus any exception status to show. */
export function orderPhase(order: Order): { index: number; exception?: string; latest?: string } {
  const done = order.timeline.filter((t) => t.complete);
  const latest = done[done.length - 1]?.stage;
  const index = latest ? PHASE_OF[latest] ?? 0 : 0;
  const exception = order.status && EXCEPTIONS.includes(order.status) ? order.status : undefined;
  return { index, exception, latest };
}
