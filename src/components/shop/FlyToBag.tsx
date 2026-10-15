"use client";

// Add-to-bag micro-animation: a thumbnail of the product lifts from where it
// was added and arcs into the bag icon, which then ticks its count up.

import { AnimatePresence, m } from "motion/react";
import { useUI } from "@/lib/ui-context";
import { usePrefersReducedMotion } from "@/lib/motion/hooks";

export default function FlyToBag() {
  const { flights, endFlight } = useUI();
  const reduce = usePrefersReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[140]">
      <AnimatePresence>
        {flights.map((f) => {
          const target = f.to;
          const size = Math.min(f.from.width, 140);
          const startX = f.from.left + f.from.width / 2 - size / 2;
          const startY = f.from.top + f.from.height / 2 - (size * 1.25) / 2;
          const endX = target.left + target.width / 2 - size / 2;
          const endY = target.top + target.height / 2 - (size * 1.25) / 2;
          return (
            <m.img
              key={f.id}
              src={f.src}
              alt=""
              className="absolute left-0 top-0 object-cover shadow-xl"
              style={{ width: size, height: size * 1.25 }}
              initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
              animate={{
                x: [startX, (startX + endX) / 2, endX],
                y: [startY, Math.min(startY, endY) - 80, endY],
                scale: [1, 0.6, 0.12],
                opacity: [1, 1, 0.4],
              }}
              transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }}
              onAnimationComplete={() => endFlight(f.id)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
