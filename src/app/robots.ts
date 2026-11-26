import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Staging deployments must not be indexed: only the live domain allows crawling.
  const live = process.env.NEXT_PUBLIC_SITE_URL === SITE_URL && process.env.ALLOW_INDEXING !== "false";
  if (!live) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/cart", "/checkout", "/orders", "/login", "/signup", "/forgot-password", "/reset-password", "/wishlist", "/customize"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
