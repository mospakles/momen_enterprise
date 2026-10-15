"use client";

// A shared wishlist: /wishlist?items=slug,slug. Without `items` it shows the
// visitor's own saved pieces (works for guests too).

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminStore } from "@/lib/admin/store";
import { useCart } from "@/lib/cart-context";
import ProductCard from "@/components/product/ProductCard";
import { SplitText } from "@/lib/motion/SplitText";

export default function WishlistPage() {
  return (
    <Suspense fallback={null}>
      <WishlistContent />
    </Suspense>
  );
}

function WishlistContent() {
  const params = useSearchParams();
  const { products, isReady } = useAdminStore();
  const { wishlist } = useCart();
  const shared = params.get("items");
  const list = useMemo(() => {
    const published = products.filter((p) => p.publishStatus === "published");
    if (shared) return shared.split(",").map((slug) => published.find((p) => p.slug === slug)).filter((p): p is NonNullable<typeof p> => Boolean(p));
    return published.filter((p) => wishlist.includes(p.id));
  }, [products, shared, wishlist]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <p className="label text-clay">{shared ? "A shared edit" : "Your wishlist"}</p>
      <SplitText as="h1" trigger="manual" text={shared ? "Pieces chosen for you." : "Saved for later."} className="display mt-4 text-[clamp(2.6rem,6vw,5rem)]" />
      {!isReady ? (
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => <span key={i} className="shimmer block aspect-3/4" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-12">
          <p className="text-ink/65">{shared ? "These pieces are no longer available." : "Tap the heart on any piece to keep it here."}</p>
          <Link href="/shop" className="mt-8 inline-block bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">Enter the collection</Link>
        </div>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
          {list.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 4} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
