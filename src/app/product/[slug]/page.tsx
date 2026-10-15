"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import ProductDetailClient from "@/components/product/ProductDetailClient";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, isReady } = useAdminStore();

  if (!isReady) return <ProductSkeleton />;

  const product = products.find((p) => p.slug === slug && p.publishStatus === "published");

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <p className="label text-clay">Not found</p>
        <h1 className="display mt-4 text-5xl">This piece has moved on.</h1>
        <p className="mt-4 text-ink/60">It may have sold out, been renamed, or retired from the collection.</p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/shop" className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">
            Enter the collection
          </Link>
          <Link href="/made-to-measure" className="border border-line px-6 py-3 text-sm hover:border-ink">
            Commission a piece
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}

/** Matches the product page layout so nothing shifts when data arrives. */
function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8" aria-busy="true" aria-label="Loading product">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7 lg:grid lg:grid-cols-[72px_1fr] lg:gap-4">
          <div className="hidden flex-col gap-3 lg:flex">
            {[0, 1, 2].map((i) => (
              <span key={i} className="shimmer block aspect-[4/5] w-full" />
            ))}
          </div>
          <span className="shimmer -mx-4 block aspect-[4/5] sm:-mx-6 lg:mx-0" />
        </div>
        <div className="space-y-4 lg:col-span-5">
          <span className="shimmer block h-3 w-32" />
          <span className="shimmer block h-12 w-4/5" />
          <span className="shimmer block h-5 w-28" />
          <span className="shimmer mt-8 block h-16 w-full" />
          <span className="shimmer block h-24 w-full" />
          <span className="shimmer block h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
