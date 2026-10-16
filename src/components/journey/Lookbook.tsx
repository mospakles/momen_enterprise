"use client";

// The collection, as a magazine spread rather than a product grid. Each look
// pairs an editorial image with a real published product and links into the
// existing product page. No prices here; this is the first point the visitor
// can click into commerce.

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { m, useScroll, useTransform } from "motion/react";
import { useAdminStore } from "@/lib/admin/store";
import type { Product } from "@/lib/types";
import { ClipReveal, Reveal } from "@/lib/motion/Reveal";
import { SplitText } from "@/lib/motion/SplitText";
import { useIsDesktop, usePrefersReducedMotion } from "@/lib/motion/hooks";
import { LOOK_PRODUCT_SLUGS, MEDIA, focal } from "./media";
import { placeholderFor } from "@/lib/brand-images";

// Asymmetric placement per look on the 12-column desktop grid.
const LAYOUT = [
  { col: "lg:col-start-1 lg:col-span-8", aspect: "aspect-[4/3] lg:aspect-[16/10]", offset: "lg:mt-0", speed: 30 },
  { col: "lg:col-start-9 lg:col-span-4", aspect: "aspect-[4/5] lg:aspect-[2/3]", offset: "lg:mt-[22vh]", speed: -50 },
  { col: "lg:col-start-2 lg:col-span-4", aspect: "aspect-[4/5]", offset: "lg:-mt-[6vh]", speed: 60 },
  { col: "lg:col-start-6 lg:col-span-7", aspect: "aspect-[4/3] lg:aspect-[16/10]", offset: "lg:mt-[16vh]", speed: -30 },
  { col: "lg:col-start-4 lg:col-span-5", aspect: "aspect-[4/5]", offset: "lg:mt-[12vh]", speed: 30 },
];

function pickLooks(products: Product[]) {
  const published = products.filter((p) => p.publishStatus === "published");
  const used = new Set<string>();
  const fallback = [...published]
    .filter((p) => p.productType !== "accessory")
    .sort((a, b) => Number(b.isSignature) - Number(a.isSignature) || Number(b.isFeatured) - Number(a.isFeatured));

  return LOOK_PRODUCT_SLUGS.map((slug) => {
    let product = published.find((p) => p.slug === slug && !used.has(p.id));
    if (!product) product = fallback.find((p) => !used.has(p.id));
    if (product) used.add(product.id);
    return product;
  });
}

export default function Lookbook() {
  const { products, isReady } = useAdminStore();
  const looks = useMemo(() => pickLooks(products), [products]);

  return (
    <section aria-labelledby="lookbook-heading" className="bg-ivory px-5 pb-32 pt-28 sm:px-10 lg:px-16 lg:pt-40">
      <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <p className="label text-clay">The collection — Lookbook</p>
          <SplitText
            as="h2"
            text={"Five looks.\nOne point of view."}
            className="display mt-5 text-[clamp(2.6rem,7vw,6.5rem)]"
          />
          <span id="lookbook-heading" className="sr-only">Lookbook</span>
        </div>
        <Reveal delay={0.15}>
          <p className="max-w-xs text-sm leading-relaxed text-ink/70">
            Heritage garments, drawn with a modern hand. Select a look to see the piece, its cloth and how it&rsquo;s made.
          </p>
        </Reveal>
      </div>

      <div className="mt-20 grid gap-x-10 gap-y-20 lg:grid-cols-12 lg:gap-y-0">
        {MEDIA.looks.map((image, i) => (
          <Look key={image.src + i} index={i} image={image} product={looks[i]} ready={isReady} />
        ))}
      </div>
    </section>
  );
}

function Look({
  index,
  image,
  product,
  ready,
}: {
  index: number;
  image: (typeof MEDIA.looks)[number];
  product?: Product;
  ready: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const layout = LAYOUT[index % LAYOUT.length];
  const desktop = useIsDesktop();
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = desktop && !reduce ? layout.speed : 0;
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const number = String(index + 1).padStart(2, "0");

  const figure = (
    <figure>
      <m.div style={{ y }}>
        <ClipReveal className={`relative ${layout.aspect} w-full bg-bone`} delay={0.05}>
          <div className="absolute inset-0 transition-transform duration-[1.4s] ease-house group-hover:scale-[1.05] group-hover:-translate-y-1 group-focus-visible:scale-[1.05]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              placeholder={placeholderFor(image.src)}
              style={focal(image).style}
              className={`object-cover ${focal(image).className}`}
            />
          </div>
          <span className="label absolute bottom-5 left-5 translate-y-3 bg-ivory px-3 py-2 text-ink opacity-0 transition-all duration-700 ease-house group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            View the look
          </span>
        </ClipReveal>
      </m.div>
      <figcaption className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 border-t border-line pt-4">
        <span className="label text-clay">Look {number}</span>
        <span>
          {product ? (
            <>
              <span className="display block text-2xl lg:text-[1.7rem]">{product.name}</span>
              <span className="mt-1 block text-sm text-ink/60">{product.fabric || product.shortDescription}</span>
              <span className="label link-line mt-3 inline-block text-ink lg:hidden">View the look</span>
            </>
          ) : ready ? (
            <span className="display block text-2xl text-ink/50">Coming soon</span>
          ) : (
            <span className="block space-y-2" aria-hidden>
              <span className="shimmer block h-6 w-2/3" />
              <span className="shimmer block h-4 w-1/3" />
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );

  return (
    <div ref={ref} className={`${layout.col} ${layout.offset}`}>
      {product ? (
        <Link
          href={`/product/${product.slug}`}
          data-cursor="View"
          className="group block focus-visible:outline-offset-8"
          aria-label={`Look ${number}: ${product.name} — view the piece`}
        >
          {figure}
        </Link>
      ) : (
        figure
      )}
    </div>
  );
}
