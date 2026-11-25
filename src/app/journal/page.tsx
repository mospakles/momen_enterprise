"use client";

import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import { formatDate } from "@/lib/format";
import PhotoBanner from "@/components/campaign/PhotoBanner";
import { shots } from "@/lib/campaign-shots";

export default function JournalPage() {
  const { blogPosts, isReady } = useAdminStore();
  const published = blogPosts.filter((p) => p.status === "published");

  return (
    <>
      <PhotoBanner shot={shots("ivory-and-blue-sets")[0]} eyebrow="Journal" title="The Momen Journal">Guides, atelier stories, and fabric notes from the Momen studio.</PhotoBanner>
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">

      {!isReady ? null : published.length === 0 ? (
        <EmptyState title="The first notes are being written." body="Atelier stories and fabric notes will appear here soon. Until then, the collection speaks for itself." />
      ) : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((p) => (
            <Link key={p.id} href={`/journal/${p.slug}`} className="group">
              <div className="relative aspect-[4/3] overflow-hidden bg-ivory-deep">
                {p.coverImage && <Image src={p.coverImage} alt={p.title} fill sizes="(min-width:1024px) 33vw, 100vw" unoptimized={/^https?:/.test(p.coverImage)} className="object-cover transition-transform duration-700 group-hover:scale-105" />}
              </div>
              <p className="mt-4 eyebrow text-clay">{formatDate(p.updatedAt)}</p>
              <p className="mt-1 font-display text-xl">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-12 border border-line p-8 sm:p-10">
      <p className="display text-3xl">{title}</p>
      <p className="mt-3 max-w-md text-sm text-ink/60">{body}</p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <Link href="/shop" className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">
          Shop the collection
        </Link>
        <Link href="/contact" className="label link-line text-ink/70 hover:text-ink">
          Contact the atelier
        </Link>
      </div>
    </div>
  );
}
