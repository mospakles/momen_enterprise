"use client";

import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";

export default function PromoBannerSection({ bannerId }: { bannerId?: string }) {
  const { banners } = useAdminStore();
  const banner = banners.find((b) => b.id === bannerId && b.active);
  if (!banner) return null;

  return (
    <section className="relative flex h-[46vh] min-h-[300px] items-center overflow-hidden bg-charcoal">
      <Image src={banner.image} alt={banner.title} fill unoptimized={!banner.image.includes("picsum.photos")} className="object-cover opacity-80" />
      <div className="absolute inset-0 bg-ink/50" />
      <div className="relative mx-auto w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl italic text-ivory sm:text-4xl">{banner.title}</h2>
        {banner.subtitle && <p className="mt-3 text-stone-light">{banner.subtitle}</p>}
        {banner.ctaLabel && banner.ctaHref && (
          <Link href={banner.ctaHref} className="eyebrow mt-6 inline-block border border-ivory px-6 py-3 text-ivory hover:bg-ivory hover:text-ink">
            {banner.ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
