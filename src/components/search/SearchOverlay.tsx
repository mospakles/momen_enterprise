"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useUI } from "@/lib/ui-context";
import { Portal } from "@/components/ui/Portal";
import { trapFocus, useDialog } from "@/lib/a11y";
import { useScrollLock } from "@/lib/motion/hooks";
import { campaignPhoto, campaignRange, casualsCollection, matchesCampaignStyle } from "@/lib/campaign-catalogue";

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI();
  const panel = useDialog<HTMLDivElement>(searchOpen, closeSearch);
  useScrollLock(searchOpen);
  if (!searchOpen) return null;

  return (
    <Portal>
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Search" onKeyDown={trapFocus}
        className="fixed inset-0 z-[130] overflow-y-auto bg-ivory">
        <SearchBody onClose={closeSearch} />
      </div>
    </Portal>
  );
}

function SearchBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const results = campaignRange.filter((style) => matchesCampaignStyle(style, query));

  return (
    <div className="mx-auto max-w-6xl px-5 pb-14 sm:px-10">
      <div className="flex h-16 items-center justify-end">
        <button type="button" onClick={onClose} className="px-3 py-2 text-sm">Close</button>
      </div>
      <label htmlFor="campaign-search" className="text-sm font-medium">Search the collection</label>
      <input id="campaign-search" data-autofocus type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder="Ankara pants, kaftan, fila…" className="mt-2 block w-full border-b border-line bg-transparent py-2 font-display text-3xl outline-none focus:border-ink sm:text-5xl" />
      <p className="my-5 text-sm text-ink/65" aria-live="polite">{results.length} {results.length === 1 ? "style" : "styles"}</p>
      {results.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
          {results.map((style) => (
            <li key={style.slug}>
              <Link href={`/product/${style.slug}`} onClick={onClose} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-bone">
                  <Image src={campaignPhoto(style.colours[0].photos[0])} alt="" fill sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover object-[50%_28%] transition-transform group-hover:scale-105" />
                </div>
                <p className="mt-2 font-display text-lg">{style.name}</p>
                <p className="text-sm text-ink/65">{style.collection === "casuals" ? casualsCollection.name : style.readyToWear && style.bespoke ? "Ready-to-Wear & Bespoke" : style.readyToWear ? "Ready-to-Wear" : "Bespoke"}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-base">Try a style name, cloth or print.</p>}
    </div>
  );
}
