"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { m, useScroll, useTransform } from "motion/react";
import { Reveal } from "@/lib/motion/Reveal";
import { SplitText } from "@/lib/motion/SplitText";
import { useIsDesktop, usePrefersReducedMotion } from "@/lib/motion/hooks";
import FabricLens from "./FabricLens";
import { MEDIA, focal } from "./media";
import { placeholderFor } from "@/lib/brand-images";

const STEPS = [
  { n: "01", title: "Measure", body: "Twenty-odd measurements, taken or guided, then checked twice. The pattern is drafted for one body." },
  { n: "02", title: "Cut", body: "Chalk on cloth, shears through it. Patterned fabric is matched across every seam before a single cut." },
  { n: "03", title: "Sew", body: "Machine where it's strongest, by hand where it shows. Embroidery is placed, never printed." },
  { n: "04", title: "Finish", body: "Hems felled, buttons hand-sewn, every thread clipped. Pressed, inspected, folded in tissue." },
];

export default function Craft() {
  return (
    <section aria-labelledby="craft-heading" className="bg-bone">
      <div className="px-5 pb-16 pt-28 sm:px-10 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-16 lg:pt-40">
        <div className="lg:col-span-4">
          <p className="label text-clay">Craft & fabric</p>
          <SplitText
            as="h2"
            text={"Look closer.\nThat's where\nthe quality is."}
            className="display mt-5 text-[clamp(2.3rem,5vw,4.5rem)]"
          />
          <span id="craft-heading" className="sr-only">Craft and fabric</span>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-ink/70">
              Move the loupe across the cloth. Strip-woven, hand-joined, finished so the inside is as considered as
              the outside.
            </p>
          </Reveal>
        </div>
        <Reveal className="mt-12 lg:col-span-8 lg:mt-0" delay={0.1}>
          <FabricLens />
        </Reveal>
      </div>

      <ProcessStrip />
    </section>
  );
}

/** Measure → cut → sew → finish. On desktop the strip is pinned and vertical
 * scroll drives it sideways; on touch or with reduced motion it becomes a
 * native swipeable row. */
function ProcessStrip() {
  const desktop = useIsDesktop();
  const reduce = usePrefersReducedMotion();
  const pinned = desktop && !reduce;
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  // Only track the section when it is actually rendered (pinned layout).
  const { scrollYProgress } = useScroll({ target: pinned ? section : undefined, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    if (!pinned || !track.current) return;
    const el = track.current;
    const measure = () => setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned]);

  const cards = (
    <>
      <div className="flex w-[78vw] shrink-0 snap-start flex-col justify-end pr-6 sm:w-[46vw] lg:w-[30vw] lg:pr-16">
        <p className="label text-clay">The making</p>
        <h3 className="display mt-5 text-[clamp(2.2rem,4.5vw,4rem)]">Four steps. No shortcuts.</h3>
        <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink/70">
          From your first measurement to the tissue paper, every momen. piece takes the same unhurried road.
        </p>
      </div>
      {STEPS.map((step, i) => (
        <article key={step.n} className="group w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[34vw]">
          <div className="relative aspect-[4/5] overflow-hidden bg-sand">
            <Image
              src={MEDIA.process[i].src}
              alt={MEDIA.process[i].alt}
              fill
              sizes="(min-width: 1024px) 34vw, 78vw"
              placeholder={placeholderFor(MEDIA.process[i].src)}
              style={focal(MEDIA.process[i]).style}
              className={`object-cover ${focal(MEDIA.process[i]).className} grayscale-[35%] transition-[transform,filter] duration-[1.4s] ease-house group-hover:scale-[1.04] group-hover:grayscale-0`}
            />
            <span className="display absolute left-5 top-3 text-[5.5rem] italic leading-none text-bone [text-shadow:0_2px_24px_rgba(18,17,14,0.45)]">
              {step.n}
            </span>
          </div>
          <h4 className="display mt-6 text-3xl">{step.title}</h4>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/70">{step.body}</p>
        </article>
      ))}
    </>
  );

  if (!pinned) {
    return (
      <div className="pb-24">
        <div className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 sm:scroll-px-10 sm:px-10" tabIndex={0} aria-label="The making process — scroll sideways">
          {cards}
        </div>
      </div>
    );
  }

  return (
    <div ref={section} className="relative" style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <m.div ref={track} className="flex w-max gap-10 pl-16 pr-16" style={{ x }}>
          {cards}
        </m.div>
        <div className="absolute bottom-10 left-16 right-16 h-px bg-ink/10" aria-hidden>
          <m.div className="h-full bg-ink" style={{ width: bar }} />
        </div>
      </div>
    </div>
  );
}
