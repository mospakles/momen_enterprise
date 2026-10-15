"use client";

import { m } from "motion/react";
import { PHASES } from "@/lib/order-phases";
import { EASE_HOUSE } from "@/lib/motion/ease";

/** Four-phase progress line: Confirmed → In production → Shipped → Delivered. */
export default function OrderPhases({ index, compact = false }: { index: number; compact?: boolean }) {
  return (
    <ol className="grid grid-cols-4" aria-label={`Order progress: ${PHASES[index]}`}>
      {PHASES.map((phase, i) => (
        <li key={phase} className="relative" aria-current={i === index ? "step" : undefined}>
          <span className="relative block h-0.5 bg-line">
            <m.span
              className="absolute inset-y-0 left-0 bg-ink"
              initial={{ width: 0 }}
              animate={{ width: i < index ? "100%" : i === index ? "50%" : "0%" }}
              transition={{ duration: 0.9, ease: EASE_HOUSE, delay: i * 0.15 }}
            />
          </span>
          <span
            aria-hidden
            className={`absolute -top-[5px] left-0 h-3 w-3 rounded-full border ${i <= index ? "border-ink bg-ink" : "border-ink/25 bg-ivory"} ${i === index ? "ring-4 ring-ink/10" : ""}`}
          />
          {!compact && <span className={`mt-4 block pr-2 text-xs ${i <= index ? "text-ink" : "text-ink/40"}`}>{phase}</span>}
        </li>
      ))}
    </ol>
  );
}
