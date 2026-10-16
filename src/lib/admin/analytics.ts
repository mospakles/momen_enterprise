// Shared date-bucketing + aggregation helpers for the dashboard/analytics
// pages — kept framework-agnostic (plain functions over `Order[]`) so the
// same logic works whether the data comes from local state or a real API.

import type { Order } from "@/lib/types";

interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

export function buildBuckets(from: Date, to: Date, maxPoints = 24): Bucket[] {
  const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  const bucketDays = Math.max(1, Math.ceil(totalDays / maxPoints));
  const buckets: Bucket[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    const end = new Date(Math.min(cursor.getTime() + bucketDays * 86_400_000 - 1, to.getTime()));
    buckets.push({
      start: new Date(cursor),
      end,
      label:
        bucketDays >= 28
          ? cursor.toLocaleDateString("en-NG", { month: "short", year: "2-digit" })
          : cursor.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
    });
    cursor.setTime(cursor.getTime() + bucketDays * 86_400_000);
  }
  return buckets;
}

export function sumByBucket<T>(items: T[], getDate: (item: T) => string, getValue: (item: T) => number, buckets: Bucket[]) {
  return buckets.map((b) => items.filter((it) => { const t = new Date(getDate(it)).getTime(); return t >= b.start.getTime() && t <= b.end.getTime(); }).reduce((sum, it) => sum + getValue(it), 0));
}

export function countByBucket<T>(items: T[], getDate: (item: T) => string, buckets: Bucket[]) {
  return sumByBucket(items, getDate, () => 1, buckets);
}

export function cumulativeByBucket(counts: number[]) {
  let running = 0;
  return counts.map((c) => (running += c));
}

export function inRange(dateIso: string, from: Date, to: Date) {
  const t = new Date(dateIso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Orders considered "revenue" for dashboard totals — placed and not cancelled/failed. */
export function isRevenueOrder(o: Order) {
  return o.paymentStatus !== "failed" && o.status !== "Cancelled";
}
