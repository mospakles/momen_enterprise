"use client";

import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";

const FEATURED_SLUGS = ["kaftans", "agbada", "shirts", "pants", "casual-wear", "accessories", "unisex"];

export default function FeaturedCategories({ headline }: { headline?: string }) {
  const { categories, products } = useAdminStore();

  const cards = FEATURED_SLUGS.map((slug) => {
    if (slug === "unisex") {
      const rep = products.find((p) => p.gender === "unisex");
      return { slug, name: "Unisex", href: "/unisex", image: rep?.images[0] ?? "/images/brand/campaign-linen-couple.jpg" };
    }
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) return null;
    const rep = products.find((p) => p.category === cat.name) ?? products.find((p) => p.category.toLowerCase().includes(slug.split("-")[0]));
    return { slug, name: cat.name, href: `/shop?category=${slug}`, image: cat.image ?? rep?.images[0] ?? "/images/brand/campaign-trio-onyx-beige-white.jpg" };
  }).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="eyebrow">Explore</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">{headline || "Shop by Category"}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.slug} href={c.href} className="group relative aspect-[4/5] overflow-hidden bg-ivory-deep">
            <Image
              src={c.image}
              alt={c.name}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              unoptimized={!c.image.includes("picsum.photos")}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <p className="font-display text-lg text-ivory sm:text-xl">{c.name}</p>
              <p className="eyebrow mt-1 text-ivory/70 group-hover:text-brass-light">Shop Now →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
