"use client";

import { useRef } from "react";
import { m, useInView } from "motion/react";
import { DURATION, EASE_HOUSE } from "./ease";
import { usePrefersReducedMotion } from "./hooks";

/** Fades and lifts its children into place the first time they scroll into
 * view. With reduced motion it becomes a plain fade. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  amount = 0.25,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  amount?: number;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: DURATION.reveal, ease: EASE_HOUSE, delay }}
    >
      {children}
    </m.div>
  );
}

/** Image mask reveal: the frame opens upward like a blind while the image
 * inside settles from a slight zoom. Reduced motion gets a soft fade.
 *
 * Visibility is observed on an unclipped wrapper: Chromium's
 * IntersectionObserver honours clip-path, so an element clipped to nothing
 * would never report itself as visible. */
export function ClipReveal({
  children,
  className,
  delay = 0,
  from = "bottom",
  amount = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right";
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });
  const reduce = usePrefersReducedMotion();
  const hidden = from === "left" ? "inset(0% 100% 0% 0%)" : from === "right" ? "inset(0% 0% 0% 100%)" : "inset(100% 0% 0% 0%)";

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        <m.div className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ duration: 0.6, delay }}>
          {children}
        </m.div>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <m.div
        className="absolute inset-0 overflow-hidden"
        initial={{ clipPath: hidden }}
        animate={{ clipPath: inView ? "inset(0% 0% 0% 0%)" : hidden }}
        transition={{ duration: 1.3, ease: EASE_HOUSE, delay }}
      >
        <m.div
          className="absolute inset-0"
          initial={{ scale: 1.18 }}
          animate={{ scale: inView ? 1 : 1.18 }}
          transition={{ duration: 1.8, ease: EASE_HOUSE, delay }}
        >
          {children}
        </m.div>
      </m.div>
    </div>
  );
}
