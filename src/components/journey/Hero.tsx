"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { shots } from "@/lib/campaign-shots";

// The hero photographs, in order. Desktop shows three side by side so no one
// is cropped at the head or feet; phones show one per slide.
const photos = shots(
  "patchwork-trousers-back", "cobalt-striped-cuff-trousers-detail", "blue-abstract-shirt-side",
  "burgundy-robe-full-length", "ivory-woven-panel-shirt-detail", "patterned-trousers-group-side",
  "black-geometric-trousers-side", "black-geometric-trousers-side-detail", "blue-geometric-set-full-length",
  "cobalt-striped-cuff-trousers-side", "cobalt-tan-cuff-trousers-back", "blue-geometric-set-seated-wide",
  "ivory-textured-polo-detail", "black-cap-profile", "cobalt-trousers-duo-front",
  "cobalt-tan-cuff-trousers-side", "landscape-print-shirt-back",
);

/** Split into slides of `size`, topping up the last slide from the start. */
function paginate(size: number) {
  const count = Math.ceil(photos.length / size);
  return Array.from({ length: count }, (_, i) =>
    Array.from({ length: size }, (_, j) => photos[(i * size + j) % photos.length]));
}

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const [perView, setPerView] = useState(3);
  const slides = paginate(perView);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const sync = () => { setPerView(wide.matches ? 3 : 1); setIndex(0); };
    sync();
    wide.addEventListener("change", sync);
    return () => wide.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!playing || hovered || focused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [playing, hovered, focused, slides.length]);

  function go(next: number) {
    setIndex((next + slides.length) % slides.length);
    setPlaying(false);
  }

  return (
    <section
      className="relative h-[min(860px,calc(100svh-4.5rem))] min-h-130 overflow-hidden bg-[#c9c6c3] text-white"
      aria-roledescription="carousel" aria-label="momen. campaign"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(delta) > 50) go(index + (delta < 0 ? 1 : -1));
      }}
    >
      <h1 className="sr-only">momen. Ankara, aso-oke and linen from Lagos</h1>
      {slides.map((panels, i) => (
        <div key={i} aria-hidden={i !== index} inert={i !== index} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}
          className={`absolute inset-0 grid grid-cols-1 gap-px transition-opacity duration-1000 ease-out motion-reduce:transition-none md:grid-cols-3 ${i === index ? "opacity-100" : "opacity-0"}`}>
          {panels.map((shot, p) => (
            <Link key={`${shot.name}-${p}`} href={shot.href} className={`group relative overflow-hidden ${p > 0 ? "hidden md:block" : ""}`}>
              <Image src={shot.src} alt={shot.alt} fill
                loading={i === 0 ? "eager" : undefined} fetchPriority={i === 0 && p === 0 ? "high" : undefined}
                sizes="(min-width: 768px) 34vw, 100vw"
                className="object-cover transition-transform duration-[1.4s] group-hover:scale-[1.03]" style={{ objectPosition: shot.pos }} />
            </Link>
          ))}
        </div>
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-night/70 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 px-5 pb-6 sm:px-10 sm:pb-8">
        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className="bg-ivory px-6 py-3.5 text-sm font-medium text-ink hover:bg-terracotta hover:text-ivory">Shop Ready-to-Wear</Link>
          <Link href="/made-to-measure" className="border border-white/70 px-6 py-3.5 text-sm font-medium text-white hover:border-white hover:bg-white/10">Explore Bespoke</Link>
        </div>
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button key={i} type="button" aria-label={`Show slide ${i + 1}`} aria-pressed={i === index}
              onClick={() => go(i)} className="grid h-9 place-items-center px-1.5">
              <span aria-hidden className={`block h-0.5 rounded-full transition-all duration-500 ${i === index ? "w-10 bg-white" : "w-5 bg-white/50 hover:bg-white/80"}`} />
            </button>
          ))}
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="ml-2 grid size-10 place-items-center rounded-full border border-white/50 hover:bg-white/15">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="grid size-10 place-items-center rounded-full border border-white/50 hover:bg-white/15">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <button type="button" onClick={() => setPlaying((value) => !value)} className="ml-1 min-w-14 rounded px-2 py-2 text-sm hover:bg-white/15">
            {playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>
    </section>
  );
}
