"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { Product } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { Reveal } from "@/lib/motion/Reveal";

/** Horizontal, swipeable row of products with arrow controls on desktop. */
export default function ProductRail({ title, kicker, products }: { title: string; kicker: string; products: Product[] }) {
  const track = useRef<HTMLUListElement>(null);
  if (products.length === 0) return null;
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section aria-label={title} className="border-t border-line pt-16">
      <div className="flex items-end justify-between">
        <Reveal>
          <p className="label text-clay">{kicker}</p>
          <h2 className="display mt-3 text-4xl">{title}</h2>
        </Reveal>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} back`} className="flex h-11 w-11 items-center justify-center rounded-full border border-line transition-colors hover:border-ink">←</button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} forward`} className="flex h-11 w-11 items-center justify-center rounded-full border border-line transition-colors hover:border-ink">→</button>
        </div>
      </div>
      <ul ref={track} className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {products.map((p) => (
          <li key={p.id} className="w-[62vw] shrink-0 snap-start sm:w-[38vw] lg:w-[calc((100%-3rem)/4)]">
            <Link href={`/product/${p.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-bone">
                <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:1024px) 22vw, 60vw" className="object-cover transition-opacity duration-700 group-hover:opacity-0" />
                {(p.hoverImage ?? p.images[1]) && (
                  <Image src={(p.hoverImage ?? p.images[1])!} alt="" fill sizes="(min-width:1024px) 22vw, 60vw" className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                )}
              </div>
              <p className="mt-3 text-sm">{p.name}</p>
              <p className="text-sm text-ink/55">{formatNaira(p.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
