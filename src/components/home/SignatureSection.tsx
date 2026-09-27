"use client";

import { useAdminStore } from "@/lib/admin/store";
import { Button } from "@/components/ui/Button";
import ProductCard from "@/components/product/ProductCard";

export interface SignatureContent {
  headline?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function SignatureSection({ content }: { content?: SignatureContent }) {
  const { products } = useAdminStore();
  const signature = products.filter((p) => p.isSignature && p.publishStatus === "published").slice(0, 4);
  if (signature.length === 0) return null;

  return (
    <section className="bg-charcoal py-20 text-ivory">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-lg">
          <p className="eyebrow text-brass-light">Signature</p>
          <h2 className="mt-2 font-display text-3xl italic sm:text-4xl">{content?.headline || "The Momen Signature"}</h2>
          <p className="mt-3 text-stone-light/90">
            {content?.subheading || "Distinctive silhouettes. Refined fabrics. Made for the modern African man."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {signature.map((p) => (
            <div key={p.id} className="bg-ivory p-3">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Button href={content?.ctaHref || "/collections/signature"} variant="outline-light">
            {content?.ctaLabel || "Explore Signature"}
          </Button>
        </div>
      </div>
    </section>
  );
}
