import type { MetadataRoute } from "next";
import { getAllProducts, SITE_URL } from "@/lib/site";
import { bespoke, bespokeSlug, readyToWear } from "@/lib/campaign-catalogue";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = [...readyToWear.map((style) => style.slug), ...bespoke.map(bespokeSlug)];
  const hidden = new Set((await getAllProducts()).filter((product) => product.seo?.noIndex).map((product) => product.slug));
  const pages = ["", "/shop", "/made-to-measure", "/collections", "/lookbook", "/measurements", "/about", "/contact", "/faq", "/journal"];
  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...slugs.filter((slug) => !hidden.has(slug))
      .map((slug) => ({ url: `${SITE_URL}/product/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
