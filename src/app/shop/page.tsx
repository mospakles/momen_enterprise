"use client";

// The catalogue. Filters live in the URL (shareable, back-button safe), the
// grid reflows with layout animation, editorial tiles break up the rows, and
// returning from a product restores how far down the visitor had scrolled.

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useAdminStore } from "@/lib/admin/store";
import { useUI } from "@/lib/ui-context";
import ProductCard from "@/components/product/ProductCard";
import FilterDrawer from "@/components/shop/FilterDrawer";
import { SORTS, activeCount, applyQuery, facets as buildFacets, parseQuery, serializeQuery, type ShopQuery, type SortKey } from "@/lib/shop-filters";
import { findOccasion } from "@/lib/occasions";
import { track, itemFromProduct } from "@/lib/analytics";
import { formatNaira } from "@/lib/format";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { SplitText } from "@/lib/motion/SplitText";
import { MEDIA } from "@/components/journey/media";
import type { Product } from "@/lib/types";

const PAGE = 12;
const DENSITY_KEY = "momen.shop.density";
const RESTORE_KEY = "momen.shop.restore";

// Editorial interruptions in the grid. Placeholder campaign imagery — see
// src/components/journey/media.ts.
const FEATURES = [
  { image: MEDIA.occasions.wedding, kicker: "The wedding edit", title: "For the vows, and every photograph after.", href: "/shop?occasion=wedding", cta: "Shop the edit" },
  { image: { src: "/images/brand/menasooke2.jpg", alt: "A man in a black tee and striped aso-oke cargo trousers" }, kicker: "The cloth", title: "Aso-oke, ankara, linen — chosen by touch.", href: "/shop?fabric=Aso-oke", cta: "Shop the cloth" },
  { image: MEDIA.bespoke, kicker: "Bespoke", title: "Cut for one. Book a fitting in Lagos or measure at home.", href: "/made-to-measure", cta: "Begin a commission" },
];

export default function ShopPage() {
  return (
    <Suspense fallback={<GridSkeleton count={8} density={3} />}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const { products, categories, isReady } = useAdminStore();
  const { headerHidden } = useUI();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlQuery = useMemo(() => parseQuery(new URLSearchParams(params.toString())), [params]);
  // Optimistic copy: controls respond instantly while the URL catches up.
  const [query, setLocalQuery] = useState(urlQuery);
  const [syncedFrom, setSyncedFrom] = useState(urlQuery);
  if (syncedFrom !== urlQuery) {
    setSyncedFrom(urlQuery);
    setLocalQuery(urlQuery);
  }
  const queryKey = params.toString();

  const [drawer, setDrawer] = useState(false);
  const [density, setDensity] = useState<1 | 2 | 3 | 4>(3);
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const setQuery = useCallback(
    (next: ShopQuery) => {
      setLocalQuery(next);
      const qs = serializeQuery(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setVisible(PAGE);
    },
    [router, pathname],
  );

  const results = useMemo(() => (isReady ? applyQuery(products, query, categories) : []), [isReady, products, query, categories]);
  const facets = useMemo(() => buildFacets(products), [products]);
  const shown = results.slice(0, visible);

  // Density preference + scroll restoration on return from a product page.
  useEffect(() => {
    try {
      const d = Number(localStorage.getItem(DENSITY_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the visitor's saved grid density
      if ([1, 2, 3, 4].includes(d)) setDensity(d as 1 | 2 | 3 | 4);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let saved: { key: string; visible: number; y: number } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(RESTORE_KEY) ?? "null");
    } catch {
      saved = null;
    }
    if (saved && saved.key === queryKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring pagination depth before restoring scroll
      setVisible(saved.visible);
      // The router may apply its own scroll after mount; re-assert ours until
      // it holds (or the visitor scrolls themselves).
      const target = saved.y;
      let tries = 0;
      const settle = () => {
        if (Math.abs(window.scrollY - target) > 4) window.scrollTo(0, target);
        if (++tries < 12) timer = window.setTimeout(settle, 60);
      };
      let timer = window.setTimeout(settle, 30);
      const cancel = () => window.clearTimeout(timer);
      window.addEventListener("wheel", cancel, { once: true, passive: true });
      window.addEventListener("touchstart", cancel, { once: true, passive: true });
      return () => {
        cancel();
        window.removeEventListener("wheel", cancel);
        window.removeEventListener("touchstart", cancel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first ready render
  }, [isReady]);

  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(RESTORE_KEY, JSON.stringify({ key: queryKey, visible, y: window.scrollY }));
      } catch {
        // ignore
      }
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(save, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    // Not saved on unmount: by then the router has already reset scroll.
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, [queryKey, visible]);

  // Infinite scroll: load the next page as the sentinel approaches.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || visible >= results.length) return;
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && setVisible((v) => v + PAGE), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, results.length]);

  useEffect(() => {
    if (!isReady) return;
    track("view_item_list", { item_list_name: queryKey || "all", items: results.slice(0, 12).map((p) => itemFromProduct(p)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per distinct query
  }, [isReady, queryKey]);

  function changeDensity(d: 1 | 2 | 3 | 4) {
    setDensity(d);
    try {
      localStorage.setItem(DENSITY_KEY, String(d));
    } catch {
      // ignore
    }
  }

  const occasion = findOccasion(query.occasion);
  const singleCategory = query.category.length === 1 ? categories.find((c) => c.slug === query.category[0]) : undefined;
  const title = query.q ? `“${query.q}”` : occasion ? occasion.label : singleCategory ? singleCategory.name : "The collection";
  const kicker = query.q ? "Search" : occasion ? "Occasion" : singleCategory ? "Garment" : "Shop";
  const intro = query.q
    ? null
    : occasion?.line ?? singleCategory?.description ?? "Agbada, kaftan, senator and the pieces around them — ready to wear or cut to measure in Lagos.";

  const chips = buildChips(query, categories);
  const showFeatures = !query.q && results.length > 8;

  // Mobile density maps 3/4 → 2, desktop 1 → 2.
  const cols = { 1: "grid-cols-1 lg:grid-cols-2", 2: "grid-cols-2 lg:grid-cols-2", 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[density];
  const featureEvery = density === 4 ? 8 : density === 2 || density === 1 ? 6 : 9;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 sm:px-6 lg:px-10">
      <header className="pb-10 pt-10 lg:pb-14 lg:pt-16">
        <p className="label text-clay">{kicker}</p>
        <SplitText key={title} as="h1" text={title} className="display mt-4 text-[clamp(2.8rem,7vw,6.5rem)]" trigger="manual" />
        {intro && <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-ink/65">{intro}</p>}
      </header>

      {/* Toolbar */}
      <div className={`sticky z-30 -mx-4 border-y border-line bg-ivory/92 px-4 backdrop-blur-md transition-[top] duration-500 ease-house sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 ${headerHidden ? "top-0" : "top-16 lg:top-18"}`}>
        <div className="flex h-14 items-center gap-4">
          <button type="button" onClick={() => setDrawer(true)} className="label flex items-center gap-2 text-ink" aria-haspopup="dialog">
            <FilterIcon /> Filter
            {activeCount(query) > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-ivory">{activeCount(query)}</span>}
          </button>
          <p className="hidden text-sm text-ink/55 sm:block" aria-live="polite">
            {isReady ? `${results.length} ${results.length === 1 ? "piece" : "pieces"}` : "Loading…"}
          </p>
          <div className="ml-auto flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm">
              <span className="label hidden text-ink/50 sm:inline">Sort</span>
              <select
                value={query.sort}
                onChange={(e) => setQuery({ ...query, sort: e.target.value as SortKey })}
                className="cursor-pointer bg-transparent py-1 text-sm outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Grid density">
              {([1, 2] as const).map((d) => (
                <DensityButton key={`m${d}`} d={d} active={(density <= 2 ? density : 2) === d} onClick={() => changeDensity(d)} className="flex lg:hidden" />
              ))}
              {([2, 3, 4] as const).map((d) => (
                <DensityButton key={`d${d}`} d={d} active={density === d} onClick={() => changeDensity(d)} className="hidden lg:flex" />
              ))}
            </div>
          </div>
        </div>
        {chips.length > 0 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto pb-3">
            <AnimatePresence initial={false}>
              {chips.map((chip) => (
                <m.button
                  key={chip.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  type="button"
                  onClick={() => setQuery(chip.remove(query))}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
                  aria-label={`Remove filter: ${chip.label}`}
                >
                  {chip.label} <span aria-hidden className="text-ink/50">×</span>
                </m.button>
              ))}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setQuery({ ...query, occasion: "", category: [], fabric: [], color: [], size: [], gender: [], availability: [], maxPrice: null, q: "" })}
              className="label shrink-0 px-2 text-ink/50 hover:text-ink"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {!isReady ? (
        <GridSkeleton count={8} density={density} />
      ) : results.length === 0 ? (
        <EmptyResults query={query} products={products} onReset={() => router.replace(pathname, { scroll: false })} />
      ) : (
        <>
          <m.ul layout className={`mt-10 grid gap-x-4 gap-y-12 lg:gap-x-6 ${cols}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.flatMap((p, i) => {
                const items = [
                  <m.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.6, ease: EASE_HOUSE, delay: Math.min(i % PAGE, 8) * 0.04 }}
                  >
                    <ProductCard product={p} priority={i < 4} sizes={density === 4 ? "(min-width:1024px) 22vw, 50vw" : density <= 2 ? "(min-width:1024px) 45vw, 100vw" : "(min-width:1024px) 30vw, 50vw"} />
                  </m.li>,
                ];
                const featureIndex = Math.floor((i + 1) / featureEvery) - 1;
                if (showFeatures && (i + 1) % featureEvery === 0 && FEATURES[featureIndex]) {
                  items.push(<Feature key={`feature-${featureIndex}`} feature={FEATURES[featureIndex]} wide={density !== 1} />);
                }
                return items;
              })}
            </AnimatePresence>
          </m.ul>
          {visible < results.length && (
            <div ref={sentinel} className="mt-12">
              <GridSkeleton count={density === 4 ? 4 : density === 3 ? 3 : 2} density={density} inline />
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={() => setVisible((v) => v + PAGE)} className="border border-ink px-8 py-3 text-sm tracking-wide transition-colors hover:bg-ink hover:text-ivory">
                  Load more — {results.length - visible} remaining
                </button>
              </div>
            </div>
          )}
          {visible >= results.length && results.length > PAGE && (
            <p className="label mt-16 text-center text-ink/40">You&rsquo;ve seen the full edit</p>
          )}
        </>
      )}

      <FilterDrawer open={drawer} onClose={() => setDrawer(false)} query={query} setQuery={setQuery} categories={categories} facets={facets} resultCount={results.length} />
    </div>
  );
}

function Feature({ feature, wide }: { feature: (typeof FEATURES)[number]; wide: boolean }) {
  return (
    <m.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className={`col-span-full ${wide ? "lg:col-span-2" : ""}`}
    >
      <Link href={feature.href} className="group relative block h-full min-h-105 overflow-hidden bg-night text-bone" data-cursor="Enter" data-tone="dark">
        <Image src={feature.image.src} alt={feature.image.alt} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-80 transition-transform duration-[1.6s] ease-house group-hover:scale-[1.04]" />
        <span className="absolute inset-0 bg-linear-to-t from-night/85 via-night/20 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 p-7 lg:p-10">
          <span className="label block text-sand">{feature.kicker}</span>
          <span className="display mt-3 block max-w-md text-[clamp(1.8rem,3vw,2.8rem)] leading-[1.05]">{feature.title}</span>
          <span className="label link-line mt-6 inline-block">{feature.cta} →</span>
        </span>
      </Link>
    </m.li>
  );
}

function EmptyResults({ query, products, onReset }: { query: ShopQuery; products: Product[]; onReset: () => void }) {
  const popular = products.filter((p) => p.publishStatus === "published" && (p.isSignature || p.isFeatured)).slice(0, 4);
  return (
    <div className="py-20">
      <p className="display max-w-xl text-4xl">Nothing matches {query.q ? <>&ldquo;{query.q}&rdquo;</> : "that combination"} — yet.</p>
      <p className="mt-4 max-w-md text-ink/65">Loosen a filter, or let us make exactly what you had in mind.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onReset} className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">Clear filters</button>
        <Link href="/made-to-measure" className="border border-line px-6 py-3 text-sm hover:border-ink">Commission a piece</Link>
      </div>
      {popular.length > 0 && (
        <>
          <p className="label mb-6 mt-20 text-clay">Most loved</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {popular.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function GridSkeleton({ count, density, inline = false }: { count: number; density: number; inline?: boolean }) {
  const cols = { 1: "grid-cols-1 lg:grid-cols-2", 2: "grid-cols-2", 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[density] ?? "grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`${inline ? "" : "mt-10"} grid gap-x-4 gap-y-12 lg:gap-x-6 ${cols}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <span className="shimmer block aspect-3/4 w-full" />
          <span className="shimmer mt-3 block h-4 w-2/3" />
          <span className="shimmer mt-2 block h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

function DensityButton({ d, active, onClick, className }: { d: 1 | 2 | 3 | 4; active: boolean; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${d} per row`}
      onClick={onClick}
      className={`h-8 w-8 items-center justify-center gap-0.5 transition-opacity ${active ? "opacity-100" : "opacity-35 hover:opacity-70"} ${className}`}
    >
      {Array.from({ length: d }).map((_, i) => (
        <span key={i} className="h-3.5 w-0.75 bg-ink" />
      ))}
    </button>
  );
}

function buildChips(q: ShopQuery, categories: { slug: string; name: string }[]) {
  const chips: { id: string; label: string; remove: (q: ShopQuery) => ShopQuery }[] = [];
  if (q.q) chips.push({ id: "q", label: `“${q.q}”`, remove: (x) => ({ ...x, q: "" }) });
  const occasion = findOccasion(q.occasion);
  if (occasion) chips.push({ id: "occasion", label: occasion.label, remove: (x) => ({ ...x, occasion: "" }) });
  q.category.forEach((slug) =>
    chips.push({ id: `c-${slug}`, label: categories.find((c) => c.slug === slug)?.name ?? slug, remove: (x) => ({ ...x, category: x.category.filter((v) => v !== slug) }) }),
  );
  q.fabric.forEach((f) => chips.push({ id: `f-${f}`, label: f, remove: (x) => ({ ...x, fabric: x.fabric.filter((v) => v !== f) }) }));
  q.color.forEach((c) => chips.push({ id: `col-${c}`, label: c, remove: (x) => ({ ...x, color: x.color.filter((v) => v !== c) }) }));
  q.size.forEach((s) => chips.push({ id: `s-${s}`, label: `Size ${s}`, remove: (x) => ({ ...x, size: x.size.filter((v) => v !== s) }) }));
  q.gender.forEach((g) => chips.push({ id: `g-${g}`, label: g === "men" ? "Menswear" : g === "women" ? "Womenswear" : "Unisex", remove: (x) => ({ ...x, gender: x.gender.filter((v) => v !== g) }) }));
  q.availability.forEach((a) =>
    chips.push({ id: `a-${a}`, label: a === "in-stock" ? "Ready to ship" : "Made to order", remove: (x) => ({ ...x, availability: x.availability.filter((v) => v !== a) }) }),
  );
  if (q.maxPrice) chips.push({ id: "max", label: `Under ${formatNaira(q.maxPrice)}`, remove: (x) => ({ ...x, maxPrice: null }) });
  return chips;
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M2 4h12M4.5 8h7M7 12h2" strokeLinecap="round" />
    </svg>
  );
}
