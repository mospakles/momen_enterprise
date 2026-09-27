"use client";

import { useAdminStore } from "@/lib/admin/store";
import { formatNaira } from "@/lib/format";

export default function DeliverySection() {
  const { productionSettings: s } = useAdminStore();
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="eyebrow">Production &amp; Delivery</p>
      <h2 className="mt-2 max-w-lg font-display text-3xl sm:text-4xl">
        Crafted to order, delivered with care.
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="border border-line bg-ivory-deep/30 p-8">
          <p className="eyebrow text-clay">Standard Production</p>
          <p className="mt-3 font-display text-2xl">
            {s.standardDays[0]}–{s.standardDays[1]} business days
          </p>
          <p className="mt-3 text-sm text-ink/70">
            Made-to-measure orders are carefully produced within the stated production timeline,
            then shipped via standard delivery for {formatNaira(s.standardFee)}.
          </p>
        </div>
        <div className="border border-brass bg-charcoal p-8 text-ivory">
          <p className="eyebrow text-brass-light">Express Production</p>
          <p className="mt-3 font-display text-2xl">
            {s.expressDays[0]}–{s.expressDays[1]} business days
          </p>
          <p className="mt-3 text-sm text-stone-light/90">
            Pay an additional {formatNaira(s.expressFee)} express production &amp; delivery fee
            to prioritize your order in the atelier queue.
          </p>
        </div>
      </div>
      <p className="mt-6 text-xs text-ink/50">
        Timelines are configured by our production team and may vary by garment. Exact dates are
        confirmed at checkout before payment.
      </p>
    </section>
  );
}
