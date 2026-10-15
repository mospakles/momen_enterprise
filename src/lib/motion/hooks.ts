"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMotionValue, useSpring, type MotionValue } from "motion/react";
import { SPRING_SOFT } from "./ease";

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Desktop mouse/trackpad — hover effects and the custom cursor live here. */
export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)");
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

/** Pointer position across the viewport, normalised to -1…1 and softened by a
 * spring. Stays at 0 on touch devices or with reduced motion. */
export function usePointerParallax(): { x: MotionValue<number>; y: MotionValue<number> } {
  const fine = useFinePointer();
  const reduce = usePrefersReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING_SOFT);
  const y = useSpring(rawY, SPRING_SOFT);

  useEffect(() => {
    if (!fine || reduce) return;
    const onMove = (event: PointerEvent) => {
      rawX.set((event.clientX / window.innerWidth) * 2 - 1);
      rawY.set((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [fine, reduce, rawX, rawY]);

  return { x, y };
}

/** Locks page scroll while an overlay (intro, drawer, modal) is open. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { overflow, paddingRight } = document.body.style;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}
