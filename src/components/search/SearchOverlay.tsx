"use client";

// Full-screen search. Instant, typo-tolerant results from the in-memory
// catalogue: pieces, categories, collections and occasions. Recent and
// trending searches when empty; a "did you mean" and suggestions when a
// query finds nothing, so it's never a dead end.

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useUI } from "@/lib/ui-context";
import { Portal } from "@/components/ui/Portal";
import { useAdminStore } from "@/lib/admin/store";
import { OCCASIONS } from "@/lib/occasions";
import { normalise, searchProducts, suggestCorrection } from "@/lib/search";
import { formatNaira } from "@/lib/format";
import { track } from "@/lib/analytics";
import { trapFocus, useDialog } from "@/lib/a11y";
import { useScrollLock } from "@/lib/motion/hooks";
import { EASE_HOUSE } from "@/lib/motion/ease";

const RECENT_KEY = "momen.search.recent";
const TRENDING = ["Agbada", "Kaftan", "Aso-oke", "Linen shirt", "Sandals"];

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI();
  const panel = useDialog<HTMLDivElement>(searchOpen, closeSearch);
  useScrollLock(searchOpen);

  return (
    <Portal>
    <AnimatePresence>
      {searchOpen && (
        <m.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          onKeyDown={trapFocus}
          data-lenis-prevent
          className="fixed inset-0 z-[130] overflow-y-auto bg-ivory"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.65, ease: EASE_HOUSE }}
        >
          <SearchBody onClose={closeSearch} />
        </m.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}

function SearchBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { products, categories, collections } = useAdminStore();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const deferred = useDeferredValue(query);
  const q = normalise(deferred);

  const results = useMemo(() => (q ? searchProducts(products, q) : []), [products, q]);
  const matchedCategories = useMemo(
    () => (q ? categories.filter((c) => normalise(c.name).includes(q) || q.includes(normalise(c.name))) : []),
    [categories, q],
  );
  const matchedCollections = useMemo(() => (q ? collections.filter((c) => normalise(c.name).includes(q)) : []), [collections, q]);
  const matchedOccasions = useMemo(
    () => (q ? OCCASIONS.filter((o) => normalise(o.label).startsWith(q) || q.split(" ").some((t) => t.length > 2 && normalise(o.label).startsWith(t))) : []),
    [q],
  );
  const correction = useMemo(
    () => (q && results.length === 0 && matchedOccasions.length === 0 ? suggestCorrection(products, q) : null),
    [products, q, results.length, matchedOccasions.length],
  );
  const popular = useMemo(() => products.filter((p) => p.publishStatus === "published" && p.isFeatured).slice(0, 4), [products]);

  useEffect(() => {
    if (!q) return;
    const id = window.setTimeout(() => track("search", { search_term: q, results: results.length }), 800);
    return () => window.clearTimeout(id);
  }, [q, results.length]);

  function remember(term: string) {
    const clean = term.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function submit(term = query) {
    if (!term.trim()) return;
    remember(term);
    onClose();
    router.push(`/shop?q=${encodeURIComponent(term.trim())}`);
  }

  const hasResults = results.length > 0 || matchedCategories.length > 0 || matchedOccasions.length > 0 || matchedCollections.length > 0;

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-20 sm:px-10">
      <div className="flex h-16 items-center justify-end lg:h-18">
        <button type="button" onClick={onClose} className="label px-2 py-3 text-ink/60 hover:text-ink">
          Close
        </button>
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-b border-ink/80 pb-3"
      >
        <label htmlFor="site-search" className="label text-clay">
          Search momen.
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="site-search"
            data-autofocus
            type="search"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Agbada, linen, wedding…"
            className="display w-full bg-transparent text-[clamp(2rem,6vw,4.5rem)] leading-tight outline-none placeholder:text-ink/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="label shrink-0 text-ink/50 hover:text-ink">
              Clear
            </button>
          )}
        </div>
      </form>

      {!q && (
        <div className="mt-12 grid gap-12 md:grid-cols-3">
          {recent.length > 0 && (
            <TermList
              title="Recent"
              terms={recent}
              onPick={(t) => setQuery(t)}
              action={
                <button
                  type="button"
                  className="text-xs text-ink/45 underline"
                  onClick={() => {
                    setRecent([]);
                    try {
                      localStorage.removeItem(RECENT_KEY);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Clear
                </button>
              }
            />
          )}
          <TermList title="Trending" terms={TRENDING} onPick={(t) => setQuery(t)} />
          <div>
            <p className="label mb-4 text-clay">Shop by occasion</p>
            <ul className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <li key={o.slug}>
                  <Link href={o.href} onClick={onClose} className="inline-block rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-ink">
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {q && hasResults && (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_3fr]">
          <div className="space-y-8">
            {matchedOccasions.length > 0 && (
              <LinkGroup title="Occasions" links={matchedOccasions.map((o) => ({ href: o.href, label: o.label }))} onNavigate={() => { remember(query); onClose(); }} />
            )}
            {matchedCategories.length > 0 && (
              <LinkGroup title="Categories" links={matchedCategories.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.name }))} onNavigate={() => { remember(query); onClose(); }} />
            )}
            {matchedCollections.length > 0 && (
              <LinkGroup title="Collections" links={matchedCollections.map((c) => ({ href: `/collections/${c.slug}`, label: c.name }))} onNavigate={() => { remember(query); onClose(); }} />
            )}
          </div>
          <div>
            <div className="mb-5 flex items-baseline justify-between">
              <p className="label text-clay" aria-live="polite">
                {results.length} {results.length === 1 ? "piece" : "pieces"}
              </p>
              {results.length > 0 && (
                <button type="button" onClick={() => submit()} className="label link-line">
                  See all results →
                </button>
              )}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {results.slice(0, 8).map((p, i) => (
                <m.li key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.5 }}>
                  <Link href={`/product/${p.slug}`} onClick={() => { remember(query); onClose(); }} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-bone">
                      <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:1024px) 18vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <p className="mt-2 text-sm">{p.name}</p>
                    <p className="text-sm text-ink/55">{formatNaira(p.price)}</p>
                  </Link>
                </m.li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {q && !hasResults && (
        <div className="mt-12">
          <p className="display text-3xl">Nothing for &ldquo;{deferred}&rdquo; — yet.</p>
          {correction ? (
            <p className="mt-3 text-ink/70">
              Did you mean{" "}
              <button type="button" className="font-semibold text-ink underline underline-offset-4" onClick={() => setQuery(correction)}>
                {correction}
              </button>
              ?
            </p>
          ) : (
            <p className="mt-3 text-ink/70">Try a garment, a cloth or an occasion — or let a stylist find it for you.</p>
          )}
          <div className="mt-8 flex flex-wrap gap-2">
            {TRENDING.map((t) => (
              <button key={t} type="button" onClick={() => setQuery(t)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
                {t}
              </button>
            ))}
          </div>
          {popular.length > 0 && (
            <>
              <p className="label mb-5 mt-14 text-clay">Most loved right now</p>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {popular.map((p) => (
                  <li key={p.id}>
                    <Link href={`/product/${p.slug}`} onClick={onClose} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-bone">
                        <Image src={p.images[0]} alt={p.name} fill sizes="25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      </div>
                      <p className="mt-2 text-sm">{p.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TermList({ title, terms, onPick, action }: { title: string; terms: string[]; onPick: (t: string) => void; action?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="label text-clay">{title}</p>
        {action}
      </div>
      <ul className="space-y-2">
        {terms.map((t) => (
          <li key={t}>
            <button type="button" onClick={() => onPick(t)} className="display link-line text-2xl text-ink/80 hover:text-ink">
              {t}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkGroup({ title, links, onNavigate }: { title: string; links: { href: string; label: string }[]; onNavigate: () => void }) {
  return (
    <div>
      <p className="label mb-3 text-clay">{title}</p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} onClick={onNavigate} className="display link-line text-2xl">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
