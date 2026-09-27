"use client";

import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import { formatDate } from "@/lib/format";

export default function JournalPage() {
  const { blogPosts, isReady } = useAdminStore();
  const published = blogPosts.filter((p) => p.status === "published");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow">Journal</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">The Momen Journal</h1>
      <p className="mt-4 max-w-lg text-ink/70">Guides, atelier stories, and fabric notes from the Momen studio.</p>

      {!isReady ? null : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((p) => (
            <Link key={p.id} href={`/journal/${p.slug}`} className="group">
              <div className="relative aspect-[4/3] overflow-hidden bg-ivory-deep">
                <Image src={p.coverImage} alt={p.title} fill unoptimized={!p.coverImage.includes("picsum.photos")} className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <p className="mt-4 eyebrow text-clay">{formatDate(p.updatedAt)}</p>
              <p className="mt-1 font-display text-xl">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
