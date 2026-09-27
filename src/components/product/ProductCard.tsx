"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Product } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import QuickViewModal from "./QuickViewModal";

export default function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, isWishlisted, addItem } = useCart();
  const [quickView, setQuickView] = useState(false);
  const wished = isWishlisted(product.id);

  return (
    <>
      <div className="group relative">
        <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
          <Link href={`/product/${product.slug}`} aria-label={product.name}>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
            {product.hoverImage && (
              <Image
                src={product.hoverImage}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </Link>

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="eyebrow bg-ivory/90 px-2 py-1 text-[10px] text-ink">New</span>
            )}
            {product.productionType === "made-to-measure" && (
              <span className="eyebrow bg-charcoal/90 px-2 py-1 text-[10px] text-ivory">Made-to-Measure</span>
            )}
          </div>

          <button
            onClick={() => toggleWishlist(product.id)}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ivory/90 text-ink transition-transform hover:scale-105"
          >
            <HeartIcon filled={wished} />
          </button>

          <div className="absolute inset-x-3 bottom-3 flex translate-y-2 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={() => setQuickView(true)}
              className="eyebrow flex-1 bg-ivory/95 py-2.5 text-ink hover:bg-ivory"
            >
              Quick View
            </button>
            <button
              onClick={() =>
                addItem(product, product.sizes[Math.floor(product.sizes.length / 2)], product.colors[0].name)
              }
              className="eyebrow flex-1 bg-ink py-2.5 text-ivory hover:bg-brass"
            >
              Quick Add
            </button>
          </div>
        </div>

        <Link href={`/product/${product.slug}`} className="mt-3 block">
          <h3 className="font-body text-sm text-ink">{product.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-ink/80">{formatNaira(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-ink/40 line-through">{formatNaira(product.compareAtPrice)}</span>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            {product.colors.map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="h-3 w-3 rounded-full border border-ink/10"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </Link>
      </div>

      {quickView && <QuickViewModal product={product} onClose={() => setQuickView(false)} />}
    </>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill={filled ? "#A3803E" : "none"} stroke="currentColor" strokeWidth="1.4">
      <path d="M10 17.2s-6.7-4.1-6.7-9a3.9 3.9 0 0 1 6.7-2.7A3.9 3.9 0 0 1 16.7 8.2c0 4.9-6.7 9-6.7 9Z" strokeLinejoin="round" />
    </svg>
  );
}
