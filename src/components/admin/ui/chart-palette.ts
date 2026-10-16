// Validated chart palette for the Momen admin dashboard.
// Categorical order + status colors are the dataviz skill's documented
// default set, re-validated against Momen's ivory chart surface (#F7F4EC):
// all lightness/chroma/CVD/normal-vision checks PASS; four colors sit below
// 3:1 contrast (relief band) — mitigated here by always pairing a legend +
// direct labels, never color alone. Do not reorder the categorical slots —
// the order IS the CVD-safety mechanism.

export const CATEGORICAL = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

// Fixed — never themed, never reused for a categorical series. Always shown
// with an icon + label, never color alone (several sit sub-3:1 on light).
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  neutral: "#898781",
} as const;

export const CHART_CHROME = {
  ink: "#1C1A16",
  secondary: "#6b6863",
  muted: "#898781",
  grid: "#e6e0d2",
  baseline: "#c9c0aa",
};

/** Semantic status → dataviz status role, for order/payment/production pills. */
export function statusRole(status: string): keyof typeof STATUS {
  const s = status.toLowerCase();
  if (["delivered", "paid", "successful", "approved", "processed", "active", "operational", "published", "completed"].some((k) => s.includes(k))) return "good";
  if (["failed", "cancelled", "rejected", "critical", "down", "disabled", "out-of-stock", "out of stock"].some((k) => s.includes(k))) return "critical";
  if (["pending", "awaiting", "requested", "on hold", "queue", "low-stock", "low stock", "degraded", "draft", "scheduled"].some((k) => s.includes(k))) return "warning";
  if (["refund", "delay", "overdue"].some((k) => s.includes(k))) return "serious";
  return "neutral";
}
