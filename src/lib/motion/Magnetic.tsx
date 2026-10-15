"use client";

import { useRef } from "react";
import { m, useMotionValue, useSpring } from "motion/react";
import { useFinePointer, usePrefersReducedMotion } from "./hooks";

/** Pulls its child gently toward the cursor while hovered, then lets go.
 * Desktop pointers only; inert on touch and with reduced motion. */
export function Magnetic({
  children,
  strength = 0.3,
  className = "inline-block",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fine = useFinePointer();
  const reduce = usePrefersReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 16, mass: 0.4 });
  const active = fine && !reduce;

  return (
    <m.span
      ref={ref}
      className={className}
      style={{ x, y }}
      onPointerMove={(event) => {
        if (!active || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * strength);
        y.set((event.clientY - rect.top - rect.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.span>
  );
}
