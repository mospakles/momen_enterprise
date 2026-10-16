"use client";

// Product gallery. Desktop: a sticky thumbnail rail beside large stacked
// images that zoom toward the cursor on hover. Mobile: a full-bleed swipe
// carousel with a counter. Any image (or video) opens a full-screen lightbox
// with keyboard, swipe and tap-to-zoom.

import Image from "next/image";
import { placeholderFor } from "@/lib/brand-images";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { trapFocus, useDialog } from "@/lib/a11y";
import { Portal } from "@/components/ui/Portal";
import { useScrollLock } from "@/lib/motion/hooks";
import { EASE_HOUSE } from "@/lib/motion/ease";

export interface Media {
  type: "image" | "video";
  src: string;
}

export const Gallery = forwardRef<HTMLDivElement, { media: Media[]; name: string; badge?: React.ReactNode }>(function Gallery(
  { media, name, badge },
  ref,
) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const mobileTrack = useRef<HTMLDivElement>(null);

  // Track which stacked image is in view to highlight its thumbnail.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        });
      },
      { threshold: 0.6 },
    );
    slides.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [media.length]);

  const goTo = (i: number) => {
    slides.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={ref}>
      {/* Desktop */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[72px_1fr]">
        <div className="sticky top-24 flex h-fit flex-col gap-3" role="tablist" aria-label="Product images">
          {media.map((item, i) => (
            <button
              key={item.src + i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`${item.type === "video" ? "Video" : "Image"} ${i + 1} of ${media.length}`}
              onClick={() => goTo(i)}
              className={`relative aspect-[4/5] w-full overflow-hidden bg-bone transition-opacity duration-500 ${active === i ? "opacity-100 ring-1 ring-ink ring-offset-2 ring-offset-ivory" : "opacity-55 hover:opacity-100"}`}
            >
              {item.type === "video" ? (
                <span className="flex h-full items-center justify-center text-xs text-ink/60">▶</span>
              ) : (
                <Image src={item.src} alt="" fill sizes="72px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {media.map((item, i) => (
            <div key={item.src + i} ref={(el) => { slides.current[i] = el; }} data-index={i} className="relative">
              {i === 0 && badge}
              <ZoomFrame item={item} alt={i === 0 ? name : `${name} — view ${i + 1}`} priority={i === 0} onOpen={() => setLightbox(i)} />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="relative -mx-4 sm:-mx-6 lg:hidden">
        {badge}
        <div
          ref={mobileTrack}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-roledescription="carousel"
          aria-label={`${name} images`}
        >
          {media.map((item, i) => (
            <button
              key={item.src + i}
              type="button"
              onClick={() => setLightbox(i)}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-bone"
              aria-label={`Open ${item.type} ${i + 1} of ${media.length} full screen`}
            >
              {item.type === "video" ? (
                <video src={item.src} className="h-full w-full object-cover" muted playsInline autoPlay loop aria-hidden />
              ) : (
                <Image src={item.src} alt={i === 0 ? name : ""} fill sizes="100vw" preload={i === 0} placeholder={placeholderFor(item.src)} className="object-cover" />
              )}
            </button>
          ))}
        </div>
        {media.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
            {media.map((_, i) => (
              <span key={i} className={`h-[3px] rounded-full bg-ivory transition-all duration-500 ${active === i ? "w-6 opacity-100" : "w-3 opacity-50"}`} />
            ))}
          </div>
        )}
      </div>

      <Lightbox media={media} name={name} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
    </div>
  );
});

/** Hover-to-zoom frame: the image scales toward the cursor. */
function ZoomFrame({ item, alt, priority, onOpen }: { item: Media; alt: string; priority: boolean; onOpen: () => void }) {
  const [origin, setOrigin] = useState("50% 50%");
  const [zoom, setZoom] = useState(false);

  if (item.type === "video") {
    return (
      <div className="relative aspect-[4/5] overflow-hidden bg-bone">
        <video src={item.src} className="h-full w-full object-cover" muted playsInline autoPlay loop controls aria-label={`${alt} (video)`} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      data-cursor="Zoom"
      aria-label={`Open ${alt} full screen`}
      className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-bone"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      <Image
        src={item.src}
        alt={alt}
        fill
        preload={priority}
        placeholder={placeholderFor(item.src)}
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="object-cover transition-transform duration-500 ease-house"
        style={{ transformOrigin: origin, transform: zoom ? "scale(1.9)" : "scale(1)" }}
      />
    </button>
  );
}

function Lightbox({
  media,
  name,
  index,
  onClose,
  onIndex,
}: {
  media: Media[];
  name: string;
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const open = index !== null;
  const ref = useDialog<HTMLDivElement>(open, onClose);
  useScrollLock(open);
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const drag = useRef<{ x: number; t: number } | null>(null);

  const step = useCallback(
    (dir: number) => {
      if (index === null) return;
      setZoomed(false);
      onIndex((index + dir + media.length) % media.length);
    },
    [index, media.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const item = index !== null ? media[index] : null;

  return (
    <Portal>
    <AnimatePresence>
      {open && item && (
        <m.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} — image ${index! + 1} of ${media.length}`}
          onKeyDown={trapFocus}
          data-tone="dark"
          data-lenis-prevent
          className="fixed inset-0 z-[160] bg-night text-bone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="absolute inset-0 touch-none overflow-hidden"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, t: Date.now() };
            }}
            onPointerMove={(e) => {
              if (!zoomed) return;
              const r = e.currentTarget.getBoundingClientRect();
              setPan({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onPointerUp={(e) => {
              const start = drag.current;
              drag.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              if (!zoomed && Math.abs(dx) > 50) {
                step(dx < 0 ? 1 : -1);
                return;
              }
              if (Math.abs(dx) < 8 && item.type === "image") {
                const r = e.currentTarget.getBoundingClientRect();
                setPan({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                setZoomed((z) => !z);
              }
            }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <m.div
                key={index}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_HOUSE }}
              >
                {item.type === "video" ? (
                  <video src={item.src} className="h-full w-full object-contain" controls autoPlay playsInline />
                ) : (
                  <Image
                    src={item.src}
                    alt={`${name} — image ${index! + 1}`}
                    fill
                    sizes="100vw"
                    quality={75}
                    className={`object-contain transition-transform duration-500 ease-house ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                    style={{ transform: zoomed ? "scale(2.4)" : "scale(1)", transformOrigin: `${pan.x}% ${pan.y}%` }}
                  />
                )}
              </m.div>
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
            <p className="label text-bone/70" aria-live="polite">
              {index! + 1} / {media.length}
            </p>
            <button type="button" onClick={onClose} className="label px-2 py-2 text-bone/80 hover:text-bone">
              Close
            </button>
          </div>
          {media.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-bone/30 text-bone/80 transition-colors hover:bg-bone hover:text-ink">
                ←
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next image" className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-bone/30 text-bone/80 transition-colors hover:bg-bone hover:text-ink">
                →
              </button>
            </>
          )}
          <p className="label absolute inset-x-0 bottom-5 text-center text-bone/50">{zoomed ? "Tap to zoom out" : "Tap to zoom · swipe for more"}</p>
        </m.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
