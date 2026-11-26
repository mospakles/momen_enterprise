"use client";

// Generic renderer for admin-authored CMS pages (Privacy Policy, Terms,
// Shipping/Returns policies, guides, custom landing pages...) — anything
// created or edited at /admin/pages shows up here immediately, at
// /<slug>. Next.js matches the explicit route folders (/shop, /about, etc.)
// before falling through to this catch-all, so those pages are unaffected.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import type { CMSPage } from "@/lib/admin/types";
import { RICH_TEXT } from "@/components/layout/rich-text";
import { POLICY_PAGES } from "@/lib/policy-pages";


export default function CmsPageClient() {
  const { slug } = useParams<{ slug: string }>();
  // The fetched result is keyed by slug, so a stale page never shows while the next one loads.
  const [result, setResult] = useState<{ slug: string; page: CMSPage | null } | null>(null);

  useEffect(() => {
    let active = true;
    void apiRequest<CMSPage>(`/pages/${encodeURIComponent(slug)}`)
      .then((page) => { if (active) setResult({ slug, page }); })
      .catch(() => { if (active) setResult({ slug, page: null }); });
    return () => { active = false; };
  }, [slug]);

  const loaded = result?.slug === slug;
  const page = loaded ? result.page : null;

  if (!loaded) return <div className="mx-auto max-w-3xl px-4 py-24" />;

  if (!page && POLICY_PAGES[slug]) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="eyebrow">Momen</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">{POLICY_PAGES[slug]}</h1>
        <p className="mt-4 text-ink/65">
          We&rsquo;re finalising this page. In the meantime, our team is happy to answer any question about it directly.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <Link href="/contact" className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">
            Contact us
          </Link>
          <Link href="/faq" className="label link-line text-ink/70 hover:text-ink">
            Read the FAQ
          </Link>
        </div>
      </div>
    );
  }

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
      <div className={`mt-8 ${RICH_TEXT}`} dangerouslySetInnerHTML={{ __html: page.body }} />
    </div>
  );
}
