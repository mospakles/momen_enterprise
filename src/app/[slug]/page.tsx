"use client";

// Generic renderer for admin-authored CMS pages (Privacy Policy, Terms,
// Shipping/Returns policies, guides, custom landing pages...) — anything
// created or edited at /admin/pages shows up here immediately, at
// /<slug>. Next.js matches the explicit route folders (/shop, /about, etc.)
// before falling through to this catch-all, so those pages are unaffected.

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";

export default function CmsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { cmsPages, isReady } = useAdminStore();

  if (!isReady) return <div className="mx-auto max-w-3xl px-4 py-24" />;

  const page = cmsPages.find((p) => p.slug === slug && p.status === "published");

  if (!page) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Page not found</h1>
        <p className="mt-3 text-ink/60">This page may have been unpublished or moved.</p>
        <Link href="/" className="eyebrow mt-6 inline-block text-brass hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Momen</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{page.title}</h1>
      <div className="prose prose-sm mt-8 max-w-none text-ink/75 [&_a]:text-brass [&_h2]:font-display [&_h2]:text-xl [&_p]:leading-relaxed" dangerouslySetInnerHTML={{ __html: page.body }} />
    </div>
  );
}
