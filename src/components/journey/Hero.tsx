"use client";

import Image from "next/image";
import { useRef } from "react";
import { m, useScroll, useTransform } from "motion/react";
import { SplitText } from "@/lib/motion/SplitText";
import { usePointerParallax, usePrefersReducedMotion } from "@/lib/motion/hooks";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { HERO_VIDEO, MEDIA } from "./media";

/** Full-viewport opening image. The headline waits for the intro (`play`),
 * the image drifts against the cursor and sinks slowly as you scroll. */
export default function Hero({ play }: { play: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const pointer = usePointerParallax();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, reduce ? 1.08 : 1.18]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const driftX = useTransform(pointer.x, [-1, 1], [18, -18]);
  const driftY = useTransform(pointer.y, [-1, 1], [12, -12]);

  return (
    <section
      ref={ref}
      data-tone="dark"
      aria-label="momen. — Tailored heritage. Modern men."
      className="relative h-[100svh] min-h-[560px] overflow-hidden bg-night text-bone"
    >
      <m.div className="absolute inset-0" style={{ y: imageY, scale: imageScale }}>
        <m.div className="absolute -inset-6" style={{ x: driftX, y: driftY }}>
          {HERO_VIDEO ? (
            <video
              className="h-full w-full object-cover"
              src={HERO_VIDEO}
              poster={MEDIA.hero.src}
              autoPlay
              muted
              loop
              playsInline
              aria-hidden
            />
          ) : (
            <Image
              src={MEDIA.hero.src}
              alt={MEDIA.hero.alt}
              fill
              preload
              sizes="100vw"
              className="object-cover object-[50%_30%]"
            />
          )}
        </m.div>
      </m.div>

      {/* Legibility scrim: keeps ivory type above AA over any photograph. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,17,14,0.55)_0%,rgba(18,17,14,0.1)_30%,rgba(18,17,14,0.2)_55%,rgba(18,17,14,0.85)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,17,14,0.6)_0%,rgba(18,17,14,0.25)_45%,transparent_70%)]" />

      <m.div
        className="relative flex h-full flex-col justify-end px-5 pb-24 sm:px-10 sm:pb-28 lg:px-16"
        style={{ y: textY, opacity: fade }}
      >
        <m.p
          className="label mb-6 text-bone/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: play ? 1 : 0 }}
          transition={{ duration: 1, ease: EASE_HOUSE, delay: 0.1 }}
        >
          The house of momen. — Lagos
        </m.p>
        <SplitText
          as="h1"
          text={"Tailored heritage.\nModern men."}
          trigger="manual"
          play={play}
          delay={0.2}
          stagger={0.09}
          className="display max-w-[14ch] text-[clamp(3.2rem,11vw,10.5rem)] italic text-bone"
        />
        <m.p
          className="mt-8 max-w-sm text-sm leading-relaxed text-bone/80 sm:text-base"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: play ? 1 : 0, y: play ? 0 : 16 }}
          transition={{ duration: 1.1, ease: EASE_HOUSE, delay: 0.8 }}
        >
          African menswear, cut in Lagos for the man who carries both his history and his future well.
        </m.p>
      </m.div>

      {/* A quiet scroll cue, not a call to action. */}
      <m.div
        aria-hidden
        className="absolute bottom-7 right-5 flex items-center gap-3 sm:right-10 lg:right-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: play ? 1 : 0 }}
        transition={{ delay: 1.3, duration: 1 }}
      >
        <span className="label text-bone/60">Scroll</span>
        <span className="relative block h-12 w-px overflow-hidden bg-bone/20">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.2s_cubic-bezier(0.76,0,0.24,1)_infinite] bg-bone" />
        </span>
      </m.div>
    </section>
  );
}
