"use client";

// 360° view from an ordered set of frames shot around the piece. Drag or
// swipe to turn it, or use the arrow keys. It turns slowly on its own until
// touched (never with reduced motion). Frames are preloaded so turning is
// smooth.

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion/hooks";

export default function SpinViewer({ frames, name }: { frames: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [touched, setTouched] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const reduce = usePrefersReducedMotion();
  const count = frames.length;

  useEffect(() => {
    let done = 0;
    const images = frames.map((src) => {
      const img = new window.Image();
      img.onload = img.onerror = () => setLoaded(++done);
      img.src = src;
      return img;
    });
    return () => images.forEach((img) => (img.onload = img.onerror = null));
  }, [frames]);

  const ready = loaded >= count;

  useEffect(() => {
    if (!ready || touched || reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 110);
    return () => window.clearInterval(id);
  }, [ready, touched, reduce, count]);

  const step = (delta: number) => setIndex((i) => (((i + delta) % count) + count) % count);

  return (
    <div className="px-6 pb-6">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${name}, 360° view. Use left and right arrows to turn.`}
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        aria-valuetext={`Angle ${index + 1} of ${count}`}
        data-cursor="Drag"
        className="relative aspect-4/5 w-full cursor-grab touch-none select-none bg-bone active:cursor-grabbing"
        onPointerDown={(e) => {
          setTouched(true);
          drag.current = { x: e.clientX, start: index };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const width = e.currentTarget.clientWidth;
          const delta = Math.round(((e.clientX - drag.current.x) / width) * count);
          setIndex((((drag.current.start - delta) % count) + count) % count);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            setTouched(true);
            step(-1);
          } else if (e.key === "ArrowRight") {
            setTouched(true);
            step(1);
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- frames are swapped every few ms; next/image's lazy pipeline would stutter */}
        <img src={frames[index]} alt={`${name} — view ${index + 1} of ${count}`} draggable={false} className="h-full w-full object-contain" />
        {!ready && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-line" aria-hidden>
            <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${(loaded / count) * 100}%` }} />
          </div>
        )}
      </div>
      <p className="label mt-4 text-center text-ink/50">{ready ? "Drag to turn" : `Loading ${loaded}/${count}`}</p>
    </div>
  );
}
