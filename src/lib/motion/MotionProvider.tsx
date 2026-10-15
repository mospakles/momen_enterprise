"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { DURATION, EASE_HOUSE } from "./ease";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/** Wraps the storefront so every `m.*` component shares the house easing and
 * honours `prefers-reduced-motion` (transforms are dropped; opacity fades
 * remain). Features load lazily, keeping the first paint light. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE_HOUSE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
