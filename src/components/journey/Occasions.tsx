"use client";

// Occasions as worlds: five panels that open on hover or focus (desktop) and
// a swipeable row of cards on touch. Each routes into the filtered catalogue.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { OCCASIONS } from "@/lib/occasions";
import { SplitText } from "@/lib/motion/SplitText";
import { MEDIA } from "./media";

export default function Occasions() {
  const [open, setOpen] = useState(0);

  return (
    <section aria-labelledby="occasions-heading" data-tone="dark" className="bg-night py-28 text-bone lg:py-40">
      <div className="px-5 sm:px-10 lg:px-16">
        <p className="label text-sand">Occasions</p>
        <SplitText as="h2" text={"Dressed for\nevery room you enter."} className="display mt-5 text-[clamp(2.4rem,6vw,5.5rem)]" />
        <span id="occasions-heading" className="sr-only">Occasions</span>
      </div>

      {/* Desktop: expanding panels */}
      <ul className="mt-16 hidden h-[78vh] gap-2 px-16 lg:flex">
        {OCCASIONS.map((occasion, i) => {
          const media = MEDIA.occasions[occasion.slug as keyof typeof MEDIA.occasions];
          const isOpen = open === i;
          return (
            <li
              key={occasion.slug}
              className="relative overflow-hidden transition-[flex-grow] duration-[900ms] ease-house"
              style={{ flexGrow: isOpen ? 4 : 1, flexBasis: 0 }}
              onMouseEnter={() => setOpen(i)}
            >
              <Link
                href={occasion.href}
                onFocus={() => setOpen(i)}
                data-cursor="Enter"
                className="group absolute inset-0 block focus-visible:outline-offset-[-6px]"
              >
                <Image
                  src={media.src}
                  alt={media.alt}
                  fill
                  sizes="60vw"
                  className={`object-cover transition-[transform,filter] duration-[1.4s] ease-house ${isOpen ? "scale-100 grayscale-0" : "scale-110 grayscale"}`}
                />
                <span className={`absolute inset-0 bg-night transition-opacity duration-700 ${isOpen ? "opacity-30" : "opacity-60"}`} />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-night/90 to-transparent p-7 pt-24">
                  <span className="label block text-sand">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`display mt-2 block whitespace-nowrap text-bone transition-all duration-700 ${isOpen ? "text-5xl" : "text-2xl"}`}>
                    {occasion.label}
                  </span>
                  <span
                    className={`block max-w-sm overflow-hidden text-sm leading-relaxed text-bone/80 transition-all duration-700 ease-house ${isOpen ? "mt-3 max-h-24 opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    {occasion.line}
                    <span className="label mt-4 block text-bone">{occasion.slug === "bespoke" ? "Begin a commission →" : "Explore the edit →"}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Touch: swipeable cards */}
      <ul className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 sm:scroll-px-10 sm:px-10 lg:hidden">
        {OCCASIONS.map((occasion, i) => {
          const media = MEDIA.occasions[occasion.slug as keyof typeof MEDIA.occasions];
          return (
            <li key={occasion.slug} className="w-[78vw] shrink-0 snap-start sm:w-[44vw]">
              <Link href={occasion.href} className="group relative block aspect-[3/4] overflow-hidden active:scale-[0.99]">
                <Image src={media.src} alt={media.alt} fill sizes="78vw" className="object-cover" />
                <span className="absolute inset-0 bg-linear-to-t from-night/90 via-night/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5">
                  <span className="label block text-sand">{String(i + 1).padStart(2, "0")}</span>
                  <span className="display mt-1 block text-4xl text-bone">{occasion.label}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-bone/80">{occasion.line}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
