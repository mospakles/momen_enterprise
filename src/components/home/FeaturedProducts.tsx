"use client";

import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import ProductCard from "@/components/product/ProductCard";

export default function FeaturedProducts({ headline }: { headline?: string }) {
  const { products } = useAdminStore();
  const featured = products.filter((p) => p.isFeatured && p.publishStatus === "published");
  if (featured.length === 0) return null;

  return (
    <section className="bg-ivory-deep/50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">Just In</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">{headline || "Featured Pieces"}</h2>
          </div>
          <Link href="/shop" className="eyebrow hidden text-clay hover:text-brass sm:block">
            Shop All
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
