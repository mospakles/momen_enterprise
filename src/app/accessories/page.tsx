"use client";

// The Accessories landing page — reached from the navbar's "Accessories"
// link (the mega-menu on hover still jumps straight to a subcategory via
// /shop?category=..., this page is what a plain click lands on). Mirrors the
// filter-chip pattern used on /made-to-measure: "All Accessories" plus one
// chip per accessory subcategory, all sourced from the admin-managed
// category tree so a new subcategory added in /admin/categories shows up
// here automatically.

import { Suspense, useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import ProductCard from "@/components/product/ProductCard";

const ACCESSORY_CATEGORY_SLUGS = ["footwear", "belts", "bags", "caps", "other-accessories"];

export default function AccessoriesPage() {
  return (
    <Suspense fallback={null}>
      <AccessoriesContent />
    </Suspense>
  );
}

function AccessoriesContent() {
  const { products, categories, isReady } = useAdminStore();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const subcategories = useMemo(
    () => ACCESSORY_CATEGORY_SLUGS.map((slug) => categories.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [categories]
  );

  const accessoryCategoryNames = useMemo(() => new Set(subcategories.map((c) => c.name)), [subcategories]);

  const items = useMemo(() => {
    const inAccessories = products.filter((p) => p.publishStatus === "published" && accessoryCategoryNames.has(p.category));
    if (!activeSlug) return inAccessories;
    const cat = subcategories.find((c) => c.slug === activeSlug);
    return cat ? inAccessories.filter((p) => p.category === cat.name) : inAccessories;
  }, [products, accessoryCategoryNames, activeSlug, subcategories]);

  return (
    <div>
      <div className="relative flex h-[42vh] min-h-[280px] items-end overflow-hidden bg-charcoal">
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <p className="eyebrow text-brass-light">Finishing Details</p>
          <h1 className="mt-2 font-display text-4xl italic text-ivory sm:text-5xl">Accessories</h1>
          <p className="mt-3 max-w-md text-stone-light">
            Pam sandals, leather belts, structured bags, hand-woven caps, and the small considered details that
            complete a Momen look.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSlug(null)}
            className={`eyebrow border px-4 py-2 ${activeSlug === null ? "border-brass bg-brass/5 text-brass" : "border-line text-ink/60 hover:border-ink"}`}
          >
            All Accessories
          </button>
          {subcategories.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveSlug(c.slug)}
              className={`eyebrow border px-4 py-2 ${activeSlug === c.slug ? "border-brass bg-brass/5 text-brass" : "border-line text-ink/60 hover:border-ink"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {!isReady ? null : items.length === 0 ? (
          <p className="text-center text-ink/60">New accessories are on the way.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
