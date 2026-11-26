import Link from "next/link";
import { isMadeToMeasure, needsMeasurements } from "@/lib/product-utils";
import type { CartItem } from "@/lib/types";

export const measureHref = (item: CartItem, back = "/checkout") => `/cart/measurements/${encodeURIComponent(item.id)}?back=${encodeURIComponent(back)}`;

/** One line under a bag item saying whether it still needs measurements. */
export default function MeasurementStatus({ item, back, className = "" }: { item: CartItem; back?: string; className?: string }) {
  if (!isMadeToMeasure(item.product)) return null;
  if (needsMeasurements(item)) {
    return (
      <p className={`text-xs text-error ${className}`}>
        Measurements needed before payment —{" "}
        <Link href={measureHref(item, back)} className="underline underline-offset-2">
          add them now
        </Link>
      </p>
    );
  }
  if (item.measurement && item.measurement.mode !== "pending") {
    return (
      <p className={`text-xs text-ink/60 ${className}`}>
        ✓ Cut to your measurements ·{" "}
        <Link href={measureHref(item, back)} className="underline underline-offset-2">
          edit
        </Link>
      </p>
    );
  }
  return <p className={`text-xs text-ink/60 ${className}`}>Standard size {item.size} · from our size guide, no measurements needed</p>;
}
