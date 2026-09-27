"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import ProductDetailClient from "@/components/product/ProductDetailClient";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, isReady } = useAdminStore();

  if (!isReady) return <div className="mx-auto max-w-7xl px-4 py-24" />;

  const product = products.find((p) => p.slug === slug && p.publishStatus === "published");

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Product not found</h1>
        <p className="mt-3 text-ink/60">This piece may be sold out, unpublished, or renamed.</p>
        <Link href="/shop" className="eyebrow mt-6 inline-block text-brass hover:underline">
          ← Back to Shop
        </Link>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}
