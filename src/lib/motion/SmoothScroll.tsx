"use client";

import { useEffect } from "react";
import { useFinePointer, usePrefersReducedMotion } from "./hooks";

/** Lenis smooth scrolling, mounted only by the landing journey, only for
 * desktop pointers and only without reduced motion. Touch devices keep their
 * native momentum scroll. The library is imported lazily. */
export function SmoothScroll() {
  const fine = useFinePointer();
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (!fine || reduce) return;
    let frame = 0;
    let destroyed = false;
    let lenis: import("lenis").default | null = null;

    void import("lenis").then(({ default: Lenis }) => {
      if (destroyed) return;
      lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [fine, reduce]);

  return null;
}
