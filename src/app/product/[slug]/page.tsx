import type { Metadata } from "next";
import ProductPageClient from "@/components/product/ProductPageClient";
import { notFound } from "next/navigation";
import { SITE_NAME, SITE_URL, absoluteUrl, getProduct, getProductResult, plainText } from "@/lib/site";
import { effectivePrice } from "@/lib/product-utils";
import PhotoStrip from "@/components/campaign/PhotoStrip";
import { campaignPhoto, campaignRange, findCampaignStyle, isCampaignProduct } from "@/lib/campaign-catalogue";
import { shotsForStyle } from "@/lib/campaign-shots";

type Props = { params: Promise<{ slug: string }> };

// Other pieces from the campaign: the shots this piece wasn't photographed in,
// two per style, starting from a different style on each product page.
function lookFor(styleSlug?: string) {
  const others = campaignRange.filter((style) => style.slug !== styleSlug);
  const start = Math.max(0, campaignRange.findIndex((style) => style.slug === styleSlug));
  const rotated = [...others.slice(start), ...others.slice(0, start)];
  return rotated.flatMap((style) => shotsForStyle(style.slug).filter((shot) => !shot.wide).slice(1, 3));
}

// Titles, descriptions and photos for search results and shared links
// (WhatsApp, Instagram, X). The page itself renders client-side.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const style = findCampaignStyle(slug);
  const product = await getProduct(slug);
  if (style && (!product || !isCampaignProduct(product))) {
    const image = absoluteUrl(campaignPhoto(style.colours[0].photos[0]));
    return {
      title: style.name,
      description: style.description,
      alternates: { canonical: `/product/${slug}` },
      openGraph: { title: style.name, description: style.description, images: [{ url: image, alt: style.name }] },
    };
  }
  if (!product) return { title: "Piece not found", robots: { index: false } };
  const description = plainText(product.shortDescription || product.description) || `${product.name} by ${SITE_NAME}`;
  const images = product.images.slice(0, 3).map((src) => ({ url: absoluteUrl(src), alt: product.name }));
  return {
    title: product.seo?.title || product.name,
    description: product.seo?.description || description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { type: "website", title: product.name, description, url: `/product/${product.slug}`, images },
    twitter: { card: "summary_large_image", title: product.name, description, images: images.map((i) => i.url) },
    robots: product.seo?.noIndex ? { index: false } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { data: product, missing } = await getProductResult(slug);
  const style = findCampaignStyle(slug);
  if (missing && !style) notFound();
  // Product structured data, so Google can show price and availability.
  const jsonLd = product && (style ? isCampaignProduct(product) : effectivePrice(product) > 0) && {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: plainText(product.description, 500),
    image: product.images.map((src) => absoluteUrl(src)),
    sku: product.sku,
    brand: { "@type": "Brand", name: "momen." },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: "NGN",
      price: effectivePrice(product),
      availability: product.stock === "out-of-stock" ? "https://schema.org/OutOfStock" : product.stock === "made-to-order" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
    },
  };
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <ProductPageClient />
      <PhotoStrip title="Complete the look" shots={lookFor(style?.slug)} className="mt-10 border-t border-line" />
    </>
  );
}
