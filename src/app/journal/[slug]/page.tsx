"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import { formatDate } from "@/lib/format";

export default function JournalPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { blogPosts, isReady } = useAdminStore();

  if (!isReady) return <div className="mx-auto max-w-3xl px-4 py-24" />;

  const post = blogPosts.find((p) => p.slug === slug && p.status === "published");

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Post not found</h1>
        <Link href="/journal" className="eyebrow mt-6 inline-block text-brass hover:underline">
          ← Back to Journal
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">{formatDate(post.updatedAt)} · {post.author}</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{post.title}</h1>
      <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-ivory-deep">
        <Image src={post.coverImage} alt={post.title} fill unoptimized={/^https?:/.test(post.coverImage) && !post.coverImage.includes("picsum.photos")} className="object-cover" />
      </div>
      <div className="prose prose-sm mt-8 max-w-none text-ink/75 [&_p]:leading-relaxed" dangerouslySetInnerHTML={{ __html: post.body }} />
      <div className="mt-8 flex flex-wrap gap-2">
        {post.tags.map((t) => (
          <span key={t} className="border border-line px-2.5 py-1 text-xs text-ink/50">{t}</span>
        ))}
      </div>
    </div>
  );
}
