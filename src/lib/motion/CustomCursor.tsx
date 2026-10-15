"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useMotionValue, useSpring } from "motion/react";
import { useFinePointer, usePrefersReducedMotion } from "./hooks";

/** A small ink dot that trails the pointer and swells into a ring over
 * anything interactive. Elements can name the action with
 * `data-cursor="View"`, which the ring then shows. Desktop only; disabled with
 * reduced motion so the native cursor remains. */
export function CustomCursor() {
  const fine = useFinePointer();
  const reduce = usePrefersReducedMotion();
  const enabled = fine && !reduce;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.3 });
  const [mode, setMode] = useState<{ hover: boolean; label?: string; dark: boolean }>({ hover: false, dark: false });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-house-cursor");

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);
      const target = event.target as Element | null;
      const interactive = target?.closest<HTMLElement>("a, button, [data-cursor], [role=button], label");
      const tone = target?.closest<HTMLElement>("[data-tone]");
      const next = {
        hover: Boolean(interactive),
        label: interactive?.dataset.cursor,
        dark: tone?.dataset.tone === "dark",
      };
      setMode((prev) => (prev.hover === next.hover && prev.label === next.label && prev.dark === next.dark ? prev : next));
    };
    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.documentElement.classList.remove("has-house-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const size = mode.label ? 88 : mode.hover ? 44 : 8;

  return (
    <m.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[300] flex items-center justify-center rounded-full"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{
        width: size,
        height: size,
        opacity: visible ? 1 : 0,
        backgroundColor: mode.label
          ? "rgba(237,230,216,0.95)"
          : mode.hover
            ? "rgba(0,0,0,0)"
            : mode.dark
              ? "rgba(237,230,216,1)"
              : "rgba(28,26,22,1)",
        borderColor: mode.dark ? "rgba(237,230,216,0.8)" : "rgba(28,26,22,0.7)",
        borderWidth: mode.hover && !mode.label ? 1 : 0,
      }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence>
        {mode.label && (
          <m.span
            key={mode.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="label text-[0.55rem] text-ink"
          >
            {mode.label}
          </m.span>
        )}
      </AnimatePresence>
    </m.div>
  );
}
