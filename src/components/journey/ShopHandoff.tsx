"use client";

// The handoff: only now, a confident invitation to shop. The CTA draws the
// curtain transition into the existing /shop rather than hard-cutting.

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { m, useScroll, useTransform } from "motion/react";
import { SplitText } from "@/lib/motion/SplitText";
import { Magnetic } from "@/lib/motion/Magnetic";
import { useCurtainNavigate } from "@/lib/motion/Curtain";
import { usePrefersReducedMotion } from "@/lib/motion/hooks";
import { MEDIA } from "./media";

const GARMENTS = ["Agbada", "Kaftan", "Senator", "Jalabia", "Aso-oke", "Brocade", "Linen"];

export default function ShopHandoff() {
  const navigate = useCurtainNavigate();
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 1.25, 1]);

  return (
    <section ref={ref} data-tone="dark" aria-labelledby="handoff-heading" className="relative overflow-hidden bg-night text-bone">
      <m.div className="absolute inset-0 opacity-35" style={{ scale }}>
        <Image src={MEDIA.handoff.src} alt="" fill sizes="100vw" className="object-cover object-top" />
      </m.div>
      <div className="absolute inset-0 bg-linear-to-b from-night via-night/60 to-night" />

      {/* Slow marquee of the wardrobe, outlined */}
      <div aria-hidden className="relative overflow-hidden pt-20">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] motion-reduce:animate-none">
          {[0, 1].map((k) => (
            <span key={k} className="display flex shrink-0 gap-12 whitespace-nowrap pr-12 text-[clamp(4rem,12vw,11rem)] italic text-transparent [-webkit-text-stroke:1px_rgba(237,230,216,0.25)]">
              {GARMENTS.map((g) => (
                <span key={g}>{g} ·</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-[80vh] flex-col items-center justify-center px-5 pb-28 pt-16 text-center">
        <p className="label text-sand">The edit is ready</p>
        <SplitText
          as="h2"
          text={"Now, the\ncollection."}
          className="display mt-6 text-[clamp(3.2rem,10vw,9rem)]"
        />
        <span id="handoff-heading" className="sr-only">Enter the collection</span>
        <div className="mt-14">
          <Magnetic strength={0.4}>
            <Link
              href="/shop"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                navigate("/shop");
              }}
              data-cursor="Enter"
              className="group relative inline-flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-bone/40 text-center text-sm tracking-wide text-bone transition-colors duration-700 hover:border-bone focus-visible:border-bone sm:h-48 sm:w-48"
            >
              <span className="absolute inset-0 translate-y-full rounded-full bg-bone transition-transform duration-700 ease-house group-hover:translate-y-0 group-focus-visible:translate-y-0" />
              <span className="relative px-6 leading-snug transition-colors duration-700 group-hover:text-ink group-focus-visible:text-ink">
                Enter the collection
              </span>
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
