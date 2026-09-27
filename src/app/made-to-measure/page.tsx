"use client";

// Step 1 of the Made-to-Measure experience: choose a garment type, then
// browse existing Momen designs within it. Selecting a design leads to the
// full customization wizard at /customize/[slug].

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import { formatNaira } from "@/lib/format";

const GARMENT_TYPES: { key: string; label: string; categorySlug?: string; garment?: string; image: string }[] = [
  { key: "kaftan", label: "Kaftan", categorySlug: "kaftans", image: "https://picsum.photos/seed/mtm-kaftan/700/850" },
  { key: "senator", label: "Senator", categorySlug: "senator", image: "https://picsum.photos/seed/mtm-senator/700/850" },
  { key: "agbada", label: "Agbada", categorySlug: "agbada", image: "https://picsum.photos/seed/mtm-agbada/700/850" },
  { key: "jalabia", label: "Jalabia", categorySlug: "jalabia", image: "https://picsum.photos/seed/mtm-jalabia/700/850" },
  { key: "shirt", label: "Shirt", categorySlug: "shirts", image: "https://picsum.photos/seed/mtm-shirt/700/850" },
  { key: "pants", label: "Pants", categorySlug: "pants", image: "https://picsum.photos/seed/mtm-pants/700/850" },
  { key: "two-piece", label: "Two-Piece", garment: "set", image: "https://picsum.photos/seed/mtm-twopiece/700/850" },
];

export default function MadeToMeasurePage() {
  return (
    <Suspense fallback={null}>
      <MtmContent />
    </Suspense>
  );
}

function MtmContent() {
  const { products, isReady } = useAdminStore();
  const [activeType, setActiveType] = useState<string | null>(null);

  const customizable = useMemo(() => products.filter((p) => p.customizable && p.publishStatus === "published"), [products]);

  const filtered = useMemo(() => {
    if (!activeType) return customizable;
    const type = GARMENT_TYPES.find((t) => t.key === activeType);
    if (!type) return customizable;
    if (type.garment) return customizable.filter((p) => p.garment === type.garment);
    return customizable.filter((p) => p.category.toLowerCase() === type.label.toLowerCase() || p.category.toLowerCase().includes(type.categorySlug!.split("-")[0]));
  }, [customizable, activeType]);

  return (
    <div>
      <div className="relative flex h-[46vh] min-h-[320px] items-end overflow-hidden bg-charcoal">
        <Image src="https://picsum.photos/seed/mtm-hero/2000/1100" alt="Momen made-to-measure" fill className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <p className="eyebrow text-brass-light">Made-to-Measure</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl italic text-ivory sm:text-5xl">
            Your Style. Your Measurements. Your Momen.
          </h1>
          <p className="mt-3 max-w-lg text-stone-light">
            Choose a piece, make it yours. Select a garment type below to begin.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="eyebrow mb-4">Step 1 — Choose What You Want</p>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          <button
            onClick={() => setActiveType(null)}
            className={`border p-2.5 text-center text-xs ${activeType === null ? "border-brass bg-brass/5 text-brass" : "border-line text-ink/60 hover:border-ink"}`}
          >
            All Pieces
          </button>
          {GARMENT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={`group relative overflow-hidden border text-left ${activeType === t.key ? "border-brass" : "border-line hover:border-ink"}`}
            >
              <div className="relative aspect-[4/5]">
                <Image src={t.image} alt={t.label} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="180px" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <p className="absolute inset-x-0 bottom-1.5 text-center font-display text-xs text-ivory sm:text-sm">{t.label}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-14">
          <p className="eyebrow mb-4">Step 2 — Choose a Design</p>
          {!isReady ? (
            <p className="text-sm text-ink/60">Loading designs…</p>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-line py-14 text-center">
              <p className="text-sm text-ink/60">
                {activeType ? "No customizable designs found for this category yet." : "No customizable designs found yet."}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {activeType && (
                  <button onClick={() => setActiveType(null)} className="eyebrow border border-ink px-5 py-2.5 text-ink hover:border-brass hover:text-brass">
                    View All Pieces
                  </button>
                )}
                <Link href="/shop" className="eyebrow border border-line px-5 py-2.5 text-ink/70 hover:border-ink hover:text-ink">
                  Browse the Shop
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
              {filtered.map((p) => (
                <Link key={p.id} href={`/customize/${p.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
                    <Image src={p.images[0]} alt={p.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <p className="mt-3 font-display text-lg">{p.name}</p>
                  <p className="mt-1 text-sm text-ink/60">{p.shortDescription || p.fabric}</p>
                  <p className="mt-2 text-sm text-ink/80">From {formatNaira(p.price)}</p>
                  <p className="eyebrow mt-2 text-clay group-hover:text-brass">Customize This Design →</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
