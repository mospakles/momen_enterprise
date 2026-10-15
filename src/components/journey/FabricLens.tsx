"use client";

// Interactive textile study. A strip-woven cloth (drawn in SVG so it stays
// sharp at any magnification) sits under a loupe that follows the pointer,
// a finger drag, or the arrow keys. Inside the loupe: individual threads, the
// over-under of the weave, and the hand-stitched seam joining the strips.

import { useCallback, useId, useRef, useState } from "react";
import { m, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion/hooks";

const ZOOM = 3.2;
const LENS = 220;

const HOTSPOTS = [
  { x: 0.24, y: 0.3, label: "Weave", note: "Over, under, over — each pick beaten tight by hand." },
  { x: 0.5, y: 0.62, label: "Seam", note: "Narrow strips joined with a hand-run stitch." },
  { x: 0.8, y: 0.38, label: "Finish", note: "Ends turned and felled so nothing frays." },
];

function Cloth({ idPrefix }: { idPrefix: string }) {
  const weave = `${idPrefix}-weave`;
  const stripes = `${idPrefix}-stripes`;
  // Each strip is a different warp colourway, as in aso-oke.
  const strips = [
    { fill: "#2B2A3F", accent: "#C9744F" },
    { fill: "#CDBFA4", accent: "#2B2A3F" },
    { fill: "#A04A2C", accent: "#EDE6D8" },
    { fill: "#1C1A16", accent: "#C7A465" },
    { fill: "#CDBFA4", accent: "#A04A2C" },
    { fill: "#2B2A3F", accent: "#CDBFA4" },
  ];

  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        {/* Basket weave: alternating thread bundles, with individual threads
            drawn inside each so magnification reveals real texture. */}
        <pattern id={weave} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="rgba(0,0,0,0)" />
          <g fill="rgba(255,255,255,0.14)">
            <rect x="0" y="0" width="4" height="4" />
            <rect x="4" y="4" width="4" height="4" />
          </g>
          <g fill="rgba(0,0,0,0.18)">
            <rect x="4" y="0" width="4" height="4" />
            <rect x="0" y="4" width="4" height="4" />
          </g>
          <g stroke="rgba(0,0,0,0.22)" strokeWidth="0.25">
            <path d="M0 1.3h4M0 2.7h4M4 5.3h4M4 6.7h4" />
            <path d="M5.3 0v4M6.7 0v4M1.3 4v4M2.7 4v4" />
          </g>
        </pattern>
        <pattern id={stripes} width="600" height="24" patternUnits="userSpaceOnUse">
          <rect y="18" width="600" height="2" fill="rgba(0,0,0,0.25)" />
        </pattern>
      </defs>

      {strips.map((s, i) => (
        <g key={i} transform={`translate(${(i * 600) / strips.length} 0)`}>
          <rect width={600 / strips.length} height="400" fill={s.fill} />
          {/* warp pinstripes */}
          {[0.18, 0.22, 0.78, 0.82].map((p) => (
            <rect key={p} x={(600 / strips.length) * p} width="1.6" height="400" fill={s.accent} opacity="0.85" />
          ))}
          {/* supplementary weft motif (openwork diamonds) */}
          {Array.from({ length: 8 }).map((_, r) => (
            <path
              key={r}
              d={`M${600 / strips.length / 2} ${r * 50 + 14} l9 11 l-9 11 l-9 -11 Z`}
              fill="none"
              stroke={s.accent}
              strokeWidth="1.4"
              opacity="0.9"
            />
          ))}
          <rect width={600 / strips.length} height="400" fill={`url(#${weave})`} />
          <rect width={600 / strips.length} height="400" fill={`url(#${stripes})`} opacity="0.5" />
        </g>
      ))}

      {/* Hand-run seams where the strips meet */}
      {strips.slice(1).map((_, i) => {
        const x = ((i + 1) * 600) / strips.length;
        return (
          <g key={i}>
            <rect x={x - 0.6} width="1.2" height="400" fill="rgba(0,0,0,0.45)" />
            <path d={`M${x} 0 V400`} stroke="#EDE6D8" strokeWidth="0.9" strokeDasharray="3 4" opacity="0.8" />
          </g>
        );
      })}
      {/* turned & felled edge at the bottom */}
      <rect y="388" width="600" height="12" fill="rgba(0,0,0,0.35)" />
      <path d="M0 391 H600" stroke="#EDE6D8" strokeWidth="0.7" strokeDasharray="2 3" opacity="0.7" />
    </svg>
  );
}

export default function FabricLens() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const frame = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const springCfg = reduce ? { stiffness: 1000, damping: 100 } : { stiffness: 260, damping: 28 };
  const lx = useSpring(useMotionValue(0), springCfg);
  const ly = useSpring(useMotionValue(0), springCfg);

  const place = useCallback(
    (nx: number, ny: number) => {
      const el = frame.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w !== size.w || h !== size.h) setSize({ w, h });
      const x = Math.min(1, Math.max(0, nx));
      const y = Math.min(1, Math.max(0, ny));
      setPos({ x, y });
      lx.set(x * w);
      ly.set(y * h);
    },
    [lx, ly, size.w, size.h],
  );

  const fromEvent = (event: React.PointerEvent) => {
    const rect = frame.current!.getBoundingClientRect();
    place((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };

  const nearest = HOTSPOTS.reduce(
    (best, h) => {
      const d = Math.hypot(h.x - pos.x, h.y - pos.y);
      return d < best.d ? { h, d } : best;
    },
    { h: HOTSPOTS[0], d: Infinity },
  );
  const focus = active && nearest.d < 0.18 ? nearest.h : null;

  return (
    <div>
      <div
        ref={frame}
        tabIndex={0}
        role="img"
        aria-label="Hand-woven strip cloth. Move the magnifier with the pointer, by dragging, or with the arrow keys to see the weave, seams and finishing up close."
        data-cursor="Explore"
        className="relative aspect-[4/3] w-full touch-pan-y select-none overflow-hidden bg-night outline-offset-4 sm:aspect-[16/9]"
        onPointerEnter={(e) => {
          setActive(true);
          fromEvent(e);
        }}
        onPointerMove={fromEvent}
        onPointerDown={(e) => {
          setActive(true);
          fromEvent(e);
        }}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(false)}
        onFocus={() => {
          setActive(true);
          place(pos.x, pos.y);
        }}
        onBlur={() => setActive(false)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.04;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const move = moves[e.key];
          if (!move) return;
          e.preventDefault();
          place(pos.x + move[0], pos.y + move[1]);
        }}
      >
        <Cloth idPrefix={`${id}-base`} />

        {HOTSPOTS.map((h) => (
          <span
            key={h.label}
            aria-hidden
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bone/80 transition-opacity duration-500 ${active ? "opacity-0" : "opacity-100"}`}
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-bone/40" />
          </span>
        ))}

        {/* The loupe */}
        <m.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 overflow-hidden rounded-full border border-bone/70 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          style={{ x: lx, y: ly, width: LENS, height: LENS, marginLeft: -LENS / 2, marginTop: -LENS / 2 }}
          animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.6 }}
          transition={{ duration: 0.45 }}
        >
          <div
            className="absolute"
            style={{
              width: size.w * ZOOM,
              height: size.h * ZOOM,
              left: LENS / 2 - pos.x * size.w * ZOOM,
              top: LENS / 2 - pos.y * size.h * ZOOM,
            }}
          >
            <Cloth idPrefix={`${id}-lens`} />
          </div>
        </m.div>

        <p className="label pointer-events-none absolute bottom-4 left-4 text-bone/70">
          {active ? `${ZOOM.toFixed(1)}× loupe` : "Hover, drag or use arrow keys"}
        </p>
      </div>

      <dl className="mt-6 grid gap-6 sm:grid-cols-3" aria-live="polite">
        {HOTSPOTS.map((h) => (
          <div
            key={h.label}
            className={`border-t pt-4 transition-colors duration-500 ${focus === h ? "border-terracotta" : "border-line"}`}
          >
            <dt className={`label transition-colors duration-500 ${focus === h ? "text-terracotta" : "text-clay"}`}>{h.label}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink/70">{h.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
