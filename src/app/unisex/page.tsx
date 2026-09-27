"use client";

import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import { Button } from "@/components/ui/Button";
import ProductCard from "@/components/product/ProductCard";

const PRINCIPLES = [
  {
    title: "Generous, Not Generic",
    body: "Every piece is cut with room to move — relaxed through the shoulder and body — so the same garment sits well on different frames without losing its shape.",
  },
  {
    title: "Fabric First",
    body: "Ankara wax prints, hand-loomed Aso-Oke, and washed cotton — chosen for how they drape and wear, not to fit a gender line.",
  },
  {
    title: "Made-to-Measure, Too",
    body: "Selected unisex pieces can still be cut to your exact measurements — look for the Made-to-Measure tag on the product card.",
  },
];

export default function UnisexPage() {
  const { products, isReady } = useAdminStore();
  const items = products.filter((p) => p.gender === "unisex" && p.publishStatus === "published");

  return (
    <div>
      <div className="relative flex h-[42vh] min-h-[280px] items-end overflow-hidden bg-charcoal">
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <p className="eyebrow text-brass-light">A Curated Edit</p>
          <h1 className="mt-2 font-display text-4xl italic text-ivory sm:text-5xl">The Unisex Collection</h1>
          <p className="mt-3 max-w-md text-stone-light">
            Contemporary African pieces, cut generously and shared across the wardrobe — relaxed sets, Ankara and
            Aso-Oke pants, oversized shirts, and considered accessories.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-14 grid gap-8 border-b border-line pb-14 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title}>
              <p className="font-display text-lg">{p.title}</p>
              <p className="mt-2 text-sm text-ink/60">{p.body}</p>
            </div>
          ))}
        </div>

        <p className="eyebrow mb-6">Shop the Edit</p>
        {!isReady ? null : items.length === 0 ? (
          <p className="text-center text-ink/60">New unisex pieces are on the way.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-ivory-deep/40 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="eyebrow text-clay">Want it cut to your measurements?</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl">Take any of these into Made-to-Measure</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
            Fabric, fit, and finish — customized to you, then made in Lagos.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button href="/made-to-measure">Start Made-to-Measure</Button>
            <Link href="/shop?gender=unisex" className="eyebrow text-clay hover:text-brass">
              View All Unisex →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
