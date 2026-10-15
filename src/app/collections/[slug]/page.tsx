"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import ProductCard from "@/components/product/ProductCard";

export default function CollectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { collections, products, isReady } = useAdminStore();

  if (!isReady) return <div className="mx-auto max-w-7xl px-4 py-24" />;

  const collection = collections.find((c) => c.slug === slug && c.publishStatus === "published");

  if (!collection) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Collection not found</h1>
        <p className="mt-3 text-ink/60">This collection may have been unpublished or renamed.</p>
        <Link href="/collections" className="eyebrow mt-6 inline-block text-brass hover:underline">
          ← Back to Collections
        </Link>
      </div>
    );
  }

  const items = products.filter((p) => p.collectionSlugs.includes(slug) && p.publishStatus === "published");

  return (
    <div>
      <div className="relative flex h-[52vh] min-h-[340px] items-end overflow-hidden bg-charcoal">
        <Image src={collection.image} alt={collection.name} fill unoptimized={/^https?:/.test(collection.image) && !collection.image.includes("picsum.photos")} className="object-cover object-[50%_18%] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          {collection.tag && <p className="eyebrow text-brass-light">{collection.tag}</p>}
          <h1 className="mt-2 font-display text-4xl italic text-ivory sm:text-5xl">{collection.name}</h1>
          <p className="mt-3 max-w-md text-stone-light">{collection.description}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <p className="text-center text-ink/60">New pieces for this collection are on the way.</p>
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
