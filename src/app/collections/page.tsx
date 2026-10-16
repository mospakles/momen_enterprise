"use client";

import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";

export default function CollectionsPage() {
  const { collections, isReady } = useAdminStore();
  const published = [...collections]
    .filter((c) => c.publishStatus === "published")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-12 max-w-xl">
        <p className="eyebrow">Collections</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Shop by Collection</h1>
        <p className="mt-4 text-ink/70">
          Each collection gathers a considered set of silhouettes — from everyday staples to
          limited-run occasion pieces.
        </p>
      </div>

      {!isReady ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer aspect-[16/9] sm:aspect-[21/9]" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {published.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="group relative flex aspect-[16/9] items-end overflow-hidden bg-ivory-deep sm:aspect-[21/9]"
            >
              {c.image && <Image
                src={c.image}
                alt={c.name}
                fill
                sizes="100vw"
                unoptimized={/^https?:/.test(c.image)}
                className="object-cover object-[50%_18%] transition-transform duration-700 group-hover:scale-105"
              />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="relative w-full p-6 sm:p-10">
                {c.tag && <p className="eyebrow text-brass-light">{c.tag}</p>}
                <p className="font-display text-2xl text-ivory sm:text-4xl">{c.name}</p>
                <p className="mt-2 max-w-md text-sm text-stone-light/90 sm:text-base">{c.description}</p>
                <p className="eyebrow mt-4 text-ivory underline-offset-4 group-hover:underline">
                  Explore Collection →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
