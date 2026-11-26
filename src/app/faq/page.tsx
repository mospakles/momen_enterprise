"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAdminStore } from "@/lib/admin/store";
import PhotoBanner from "@/components/campaign/PhotoBanner";
import { shots } from "@/lib/campaign-shots";

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
    <>
      <PhotoBanner shot={shots("burgundy-robe-studio")[0]} eyebrow="Support" title="Frequently Asked Questions">Everything you need to know about ordering, made-to-measure, and delivery.</PhotoBanner>
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">

      {!isReady ? null : grouped.size === 0 ? (
        <EmptyState title="Questions are welcome." body="We're putting our answers in order. Ask us anything about sizing, bespoke orders or delivery and we'll reply personally." />
      ) : (
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
    </>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-12 border border-line p-8 sm:p-10">
      <p className="display text-3xl">{title}</p>
      <p className="mt-3 max-w-md text-sm text-ink/60">{body}</p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <Link href="/shop" className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">
          Shop the collection
        </Link>
        <Link href="/contact" className="label link-line text-ink/70 hover:text-ink">
          Contact the atelier
        </Link>
      </div>
    </div>
  );
}
