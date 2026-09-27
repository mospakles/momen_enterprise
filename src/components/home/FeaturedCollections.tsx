"use client";

import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";

export default function FeaturedCollections({ headline }: { headline?: string }) {
  const { collections } = useAdminStore();
  const featured = [...collections]
    .filter((c) => c.publishStatus === "published")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="eyebrow">Shop By</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">{headline || "Collections"}</h2>
        </div>
        <Link href="/collections" className="eyebrow hidden text-clay hover:text-brass sm:block">
          View All Collections
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {featured.map((c, i) => (
          <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            className={`group relative overflow-hidden bg-ivory-deep ${i === 0 ? "col-span-2 aspect-[16/9] lg:col-span-1 lg:aspect-[4/5]" : "aspect-[4/5]"}`}
          >
            <Image
              src={c.image}
              alt={c.name}
              fill
              sizes="(min-width: 1024px) 33vw, 50vw"
              unoptimized={!c.image.includes("picsum.photos")}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              {c.tag && <p className="eyebrow text-brass-light">{c.tag}</p>}
              <p className="font-display text-lg text-ivory sm:text-xl">{c.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
