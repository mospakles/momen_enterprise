"use client";

// The measuring mannequin: a realistic male figure, front or back, with the
// tape drawn exactly where it goes for the selected measurement. "Around"
// measurements wrap the body (solid in front, dashed where the tape passes
// behind); straight measurements run between a Start and an End marker.

import { useId, useState, useSyncExternalStore } from "react";
import type { MannequinView, Placement } from "@/lib/measurement-guide";

const WIDE = "(min-width: 1024px)";
function useIsWide() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(WIDE).matches,
    () => false
  );
}

/** Vertical window that keeps the whole tape in view with some body around
 * it, so a phone shows the chest up close instead of a tiny full figure. */
function focusWindow(placement: Placement | undefined, imageHeight: number) {
  if (!placement) return { y: 0, height: imageHeight };
  const ys = placement.kind === "around" ? [placement.cy - 40, placement.cy + 40] : placement.points.map((p) => p[1]);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const height = Math.min(imageHeight, Math.max(640, bottom - top + 300));
  const y = Math.max(0, Math.min(imageHeight - height, (top + bottom) / 2 - height / 2));
  return { y, height };
}

const SRC = "/images/measurements/male-fit-reference.webp";
const IMAGE = { width: 1312, height: 1199 };
/** The back figure sits this far right of the front figure in the image. */
const BACK_OFFSET = 548;
/** Each view frames one figure; x is in image pixels. */
const FRAME: Record<MannequinView, { x: number; width: number }> = {
  front: { x: 132, width: 500 },
  back: { x: 132 + BACK_OFFSET, width: 500 },
};

const TAPE = "#F7F4EC";
const TAPE_EDGE = "#12110E";
const TICK = "#A3803E";

function linePath(points: [number, number][], curve?: boolean) {
  if (curve && points.length === 3) {
    const [a, c, b] = points;
    return `M${a[0]} ${a[1]} Q${c[0]} ${2 * c[1] - (a[1] + b[1]) / 2} ${b[0]} ${b[1]}`;
  }
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
}

function Tape({ d, dashed = false }: { d: string; dashed?: boolean }) {
  if (dashed) {
    return <path d={d} fill="none" stroke={TAPE} strokeWidth="5" strokeDasharray="3 11" strokeLinecap="round" opacity="0.8" />;
  }
  return (
    <>
      <path d={d} fill="none" stroke={TAPE_EDGE} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d={d} fill="none" stroke={TAPE} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={TICK} strokeWidth="6" strokeDasharray="2 10" strokeLinejoin="round" />
    </>
  );
}

function Marker({ x, y, text, side, bounds }: { x: number; y: number; text: string; side: "left" | "right" | "below"; bounds: [number, number] }) {
  const w = text.length * 13 + 22;
  // Flip the label to the other side if it would run off the frame. "below"
  // is for horizontal tapes, where a label beside the dot would cover the tape.
  let tx = side === "right" ? x + 18 : side === "left" ? x - 18 - w : Math.min(Math.max(x - w / 2, bounds[0] + 6), bounds[1] - 6 - w);
  if (side !== "below" && tx < bounds[0] + 6) tx = x + 18;
  else if (side !== "below" && tx + w > bounds[1] - 6) tx = x - 18 - w;
  const ly = side === "below" ? y + 42 : y;
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill={TICK} stroke={TAPE} strokeWidth="4" />
      <rect x={tx} y={ly - 17} width={w} height="34" rx="17" fill={TAPE_EDGE} opacity="0.88" />
      <text x={tx + w / 2} y={ly + 7} textAnchor="middle" fill={TAPE} fontSize="20" fontWeight="600" letterSpacing="1.5" style={{ textTransform: "uppercase" }}>
        {text}
      </text>
    </g>
  );
}

function Overlay({ placement, dx, glowId }: { placement: Placement; dx: number; glowId: string }) {
  if (placement.kind === "around") {
    const { cx, cy, rx } = placement;
    const x = cx + dx;
    const ry = Math.max(7, rx * 0.15);
    const front = `M${x - rx} ${cy} A${rx} ${ry} 0 0 0 ${x + rx} ${cy}`;
    const behind = `M${x - rx} ${cy} A${rx} ${ry} 0 0 1 ${x + rx} ${cy}`;
    return (
      <g>
        <ellipse cx={x} cy={cy} rx={rx + 26} ry={Math.max(46, rx * 0.5)} fill={`url(#${glowId})`} />
        <Tape d={behind} dashed />
        <Tape d={front} />
        {/* Where the two ends of the tape meet, and the way it wraps. */}
        <rect x={x - 5} y={cy + ry - 13} width="10" height="26" rx="2" fill={TICK} stroke={TAPE} strokeWidth="2.5" />
        <path d={`M${x + rx + 20} ${cy - 4} l-9 -15 m9 15 l-17 -3`} fill="none" stroke={TAPE} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  const points = placement.points.map(([px, py]) => [px + dx, py] as [number, number]);
  const start = points[0];
  const end = points[points.length - 1];
  const midX = FRAME.front.x + dx + FRAME.front.width / 2;
  const cxs = points.map((p) => p[0]);
  const cys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...cxs), Math.max(...cxs), Math.min(...cys), Math.max(...cys)];
  const bounds: [number, number] = [FRAME.front.x + dx, FRAME.front.x + dx + FRAME.front.width];
  const horizontal = start[1] === end[1];
  const sideOf = (p: [number, number], fallback: "left" | "right") => (Math.abs(p[0] - midX) < 30 ? fallback : p[0] > midX ? "right" : "left");
  return (
    <g>
      <ellipse cx={(minX + maxX) / 2} cy={(minY + maxY) / 2} rx={(maxX - minX) / 2 + 46} ry={(maxY - minY) / 2 + 46} fill={`url(#${glowId})`} />
      <Tape d={linePath(points, placement.curve)} />
      <Marker x={start[0]} y={start[1]} text="Start" side={horizontal ? "below" : sideOf(start, "right")} bounds={bounds} />
      <Marker x={end[0]} y={end[1]} text="End" side={horizontal ? "below" : sideOf(end, start[0] === end[0] ? "right" : "left")} bounds={bounds} />
    </g>
  );
}

export default function MeasurementMannequin({
  placement,
  label,
  className = "",
  compact = false,
  zoomOnSmallScreens = false,
}: {
  /** Tape to draw; omit for the plain figure. */
  placement?: Placement;
  /** Name of the selected measurement, announced and shown as a caption. */
  label?: string;
  className?: string;
  /** Hides the caption, for tight layouts. */
  compact?: boolean;
  /** Below the lg breakpoint, frame just the measured area. */
  zoomOnSmallScreens?: boolean;
}) {
  const glowId = useId();
  const wide = useIsWide();
  // The view follows the measurement unless the customer flips it; the
  // choice is forgotten when a different measurement is selected.
  const [override, setOverride] = useState<{ label?: string; view: MannequinView } | null>(null);
  const natural: MannequinView = placement?.views[0] ?? "front";
  const view = override && override.label === label ? override.view : natural;
  const drawable = placement?.views.includes(view) ?? false;
  const frame = FRAME[view];
  const vertical = zoomOnSmallScreens && !wide ? focusWindow(drawable ? placement : undefined, IMAGE.height) : { y: 0, height: IMAGE.height };

  return (
    <figure className={`w-full ${className}`}>
      <div className="relative overflow-hidden bg-night">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(205,191,164,0.22),transparent_65%)]" />
        <svg
          viewBox={`${frame.x} ${vertical.y} ${frame.width} ${vertical.height}`}
          className="relative block h-auto w-full"
          role="img"
          aria-label={
            label
              ? `Male mannequin, ${view} view, showing where to place the tape for ${label}`
              : `Male mannequin, ${view} view`
          }
        >
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0%" stopColor="#F2C879" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F2C879" stopOpacity="0" />
            </radialGradient>
          </defs>
          <image href={SRC} width={IMAGE.width} height={IMAGE.height} />
          {placement && drawable && (
            <g key={`${label}-${view}`} className="tape-in">
              <Overlay placement={placement} dx={view === "back" ? BACK_OFFSET : 0} glowId={glowId} />
            </g>
          )}
        </svg>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex border border-ivory/25 bg-night/70 backdrop-blur-sm" role="group" aria-label="Mannequin view">
            {(["front", "back"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setOverride({ label, view: side })}
                aria-pressed={view === side}
                className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  view === side ? "bg-ivory text-ink" : "text-ivory/75 hover:text-ivory"
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        {placement && !drawable && (
          <div className="absolute inset-x-3 bottom-3 bg-night/85 px-3 py-2.5 text-center text-xs text-ivory backdrop-blur-sm">
            This one is measured on the {natural}.{" "}
            <button type="button" onClick={() => setOverride(null)} className="underline underline-offset-2">
              Show the {natural} view
            </button>
          </div>
        )}
      </div>
      {!compact && (
        <figcaption className="mt-2 text-center text-xs text-ink/60" aria-live="polite">
          {label && placement
            ? placement.kind === "around"
              ? `${label}: the tape wraps all the way around. The dotted part passes behind.`
              : `${label}: run the tape from Start to End.`
            : label
              ? `${label}: follow the written steps for this one.`
              : "Select a measurement to see where the tape goes."}
        </figcaption>
      )}
    </figure>
  );
}
