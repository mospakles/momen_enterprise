"use client";

import Image from "next/image";
import Link from "next/link";
import { ClipReveal, Reveal } from "@/lib/motion/Reveal";
import { SplitText } from "@/lib/motion/SplitText";
import { Magnetic } from "@/lib/motion/Magnetic";
import { MEDIA, focal } from "./media";
import { placeholderFor } from "@/lib/brand-images";

export default function Bespoke() {
  return (
    <section aria-labelledby="bespoke-heading" className="bg-sand/40 px-5 py-28 sm:px-10 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-16 lg:py-40">
      <ClipReveal from="left" className="relative aspect-[4/5] w-full bg-sand lg:col-span-6 lg:aspect-[5/6]">
        <Image src={MEDIA.bespoke.src} alt={MEDIA.bespoke.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" placeholder={placeholderFor(MEDIA.bespoke.src)} style={focal(MEDIA.bespoke).style} className={`object-cover ${focal(MEDIA.bespoke).className}`} />
      </ClipReveal>

      <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0">
        <p className="label text-clay">Bespoke — Made to measure</p>
        <SplitText as="h2" text={"Cut for one.\nYou."} className="display mt-5 text-[clamp(2.8rem,6.5vw,6rem)]" />
        <span id="bespoke-heading" className="sr-only">Bespoke</span>
        <Reveal delay={0.2}>
          <p className="mt-7 max-w-md text-[0.95rem] leading-relaxed text-ink/75">
            Sit with a momen. tailor in Lagos, or measure at home with our guided fitting. Choose your cloth, your collar,
            the fall of your sleeve. We cut a pattern that exists for nobody else.
          </p>
          <ul className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-ink/15 pt-6 text-sm text-ink/70">
            <li><span className="display block text-3xl text-ink">1</span>Measure</li>
            <li><span className="display block text-3xl text-ink">2</span>Choose cloth</li>
            <li><span className="display block text-3xl text-ink">3</span>Fitted & finished</li>
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Magnetic>
              <Link
                href="/made-to-measure"
                className="inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-sm tracking-wide text-ivory transition-colors duration-500 hover:bg-terracotta active:scale-[0.98]"
              >
                Book a fitting
                <span aria-hidden>→</span>
              </Link>
            </Magnetic>
            <Link href="/measurements" className="label link-line text-ink">
              Measure at home
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
