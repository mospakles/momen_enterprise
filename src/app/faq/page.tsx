"use client";

import { useMemo } from "react";
import { useAdminStore } from "@/lib/admin/store";

export default function FaqPage() {
  const { faqs, isReady } = useAdminStore();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof faqs>();
    [...faqs]
      .filter((f) => f.published)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((f) => map.set(f.category, [...(map.get(f.category) ?? []), f]));
    return map;
  }, [faqs]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Support</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Frequently Asked Questions</h1>
      <p className="mt-4 text-ink/70">Everything you need to know about ordering, made-to-measure, and delivery.</p>

      {!isReady ? null : (
        <div className="mt-12 space-y-10">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <p className="eyebrow mb-4 text-clay">{category}</p>
              <div className="divide-y divide-line border-t border-line">
                {items.map((f) => (
                  <details key={f.id} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg">
                      {f.question}
                      <span className="ml-4 text-ink/40 transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">{f.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
