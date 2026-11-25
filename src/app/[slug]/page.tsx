import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsPageClient from "@/components/content/CmsPageClient";
import { POLICY_PAGES } from "@/lib/policy-pages";
import { getCmsPageResult, plainText } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getCmsPageResult(slug);
  // Unpublished policy placeholders and unknown addresses stay out of search.
  if (!data) return { title: POLICY_PAGES[slug] ?? "Page not found", robots: { index: false } };
  return { title: data.seo?.title || data.title, description: data.seo?.description || plainText(data.body), alternates: { canonical: `/${slug}` } };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  // Unknown addresses get a real 404, except the policy pages, which show a
  // "being finalised" note until they're published in Admin → Pages.
  const { missing } = await getCmsPageResult(slug);
  if (missing && !POLICY_PAGES[slug]) notFound();
  return <CmsPageClient />;
}
