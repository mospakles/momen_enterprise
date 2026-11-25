"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CampaignRange } from "@/components/collection/CampaignRange";
import FilterDrawer from "@/components/shop/FilterDrawer";
import PhotoBanner from "@/components/campaign/PhotoBanner";
import { shots } from "@/lib/campaign-shots";
import { useAdminStore } from "@/lib/admin/store";
import { campaignSizes, findCampaignProduct, matchesCampaignStyle, readyToWear } from "@/lib/campaign-catalogue";
import { activeCount, applyQuery, facets, parseQuery, serializeQuery, SORTS, type ShopQuery } from "@/lib/shop-filters";
import { normalise } from "@/lib/search";
import type { Category } from "@/lib/types";

const legacyGroups: Record<string, string[]> = {
  pants: ["ankara-pants", "aso-oke-patchwork-pants"],
  shirts: ["vintage-shirt", "linen-tee-aso-oke"],
  "casual-wear": ["two-piece"],
  caps: ["fila"],
  accessories: ["fila"],
};

const categories: Category[] = readyToWear.map((style, sortOrder) => ({
  id: style.slug, slug: style.slug, name: style.name, sortOrder, publishStatus: "published", seo: {},
}));
const campaignSizeOptions = [...new Set(readyToWear.flatMap((style) => campaignSizes(style)))];

export default function ShopPage() {
  return (
    <>
      <PhotoBanner shot={shots("patterned-trousers-trio")[0]} title="Ready-to-Wear">
        Explore Ankara pants, aso-oke patchwork, jalabia, two-piece sets, vintage shirts, linen tees and fila.
      </PhotoBanner>
      <div className="mx-auto max-w-[1600px] px-5 py-9 sm:px-10 lg:py-12">
        <Suspense fallback={<CampaignRange styles={readyToWear} />}>
          <ShopContent />
        </Suspense>
      </div>
    </>
  );
}

function ShopContent() {
  const { products } = useAdminStore();
  const params = useSearchParams();
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const query = parseQuery(new URLSearchParams(params.toString()));
  query.category = [...new Set(query.category.flatMap((slug) => Object.hasOwn(legacyGroups, slug) ? legacyGroups[slug] : [slug]))];

  const live = readyToWear.flatMap((style) => {
    const product = findCampaignProduct(products, style.slug);
    return product ? [{ ...product, category: style.slug }] : [];
  });
  const searched = applyQuery(live, query, categories);
  const liveMatches = query.q ? applyQuery(live, { ...query, q: "" }, categories).filter((product) =>
    searched.some((match) => match.id === product.id) || readyToWear.some((style) => style.slug === product.slug && matchesCampaignStyle(style, query.q)),
  ) : searched;
  const selected = liveMatches.flatMap((product) => readyToWear.filter((style) => style.slug === product.slug));
  const purchasableFilter = Boolean(query.availability.length || query.maxPrice || query.occasion || query.gender.length);
  const previews = purchasableFilter ? [] : readyToWear.filter((style) => !live.some((product) => product.slug === style.slug) &&
    (!query.category.length || query.category.includes(style.slug)) &&
    matchesCampaignStyle(style, query.q) &&
    (!query.size.length || campaignSizes(style).some((size) => query.size.includes(size))) &&
    (!query.color.length || style.colours.some((colour) => query.color.includes(colour.name))) &&
    (!query.fabric.length || query.fabric.some((fabric) => normalise(style.description).includes(normalise(fabric)))));
  const matches = [...selected, ...previews];
  const sizeOptions = [...new Set([...campaignSizeOptions, ...live.flatMap((product) => product.sizes)])];
  const selectedSizes = query.size.join(",");

  function update(next: ShopQuery) {
    const search = serializeQuery(next);
    router.replace(search ? `/shop?${search}` : "/shop", { scroll: false });
  }

  return (
    <>
      <nav aria-label="Shop by style" className="mb-6 flex flex-wrap gap-2">
        {[{ slug: "", name: "All styles" }, ...categories].map(({ slug, name }) => {
          const active = slug ? query.category.length === 1 && query.category[0] === slug : !query.category.length;
          return (
            <button key={slug} type="button" aria-pressed={active} className={`rounded-full border px-4 py-2 text-sm ${active ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
              onClick={() => update({ ...query, category: slug ? [slug] : [] })}>{name}</button>
          );
        })}
      </nav>
      <div className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-line py-3.5">
        <p className="text-sm text-ink/70" aria-live="polite">
          {query.q ? `${matches.length} results for “${query.q}”` : `${matches.length} ${matches.length === 1 ? "style" : "styles"}`}
        </p>
        <label className="flex items-center gap-2 text-sm">
          Size
          <select value={selectedSizes} onChange={(event) => update({ ...query, size: event.target.value ? [event.target.value] : [] })}
            className="rounded border border-line bg-ivory px-2 py-1">
            <option value="">All sizes</option>
            {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            {selectedSizes && !sizeOptions.includes(selectedSizes) && <option value={selectedSizes}>{query.size.join(", ")}</option>}
          </select>
        </label>
        {live.length > 0 && (
          <>
            <button type="button" className="text-sm underline underline-offset-4" onClick={() => setFilterOpen(true)} aria-haspopup="dialog">Filter</button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Sort
              <select value={query.sort} onChange={(event) => update({ ...query, sort: event.target.value as ShopQuery["sort"] })} className="rounded border border-line bg-ivory px-2 py-1">
                {SORTS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          </>
        )}
        {(query.q || activeCount(query) > 0) && <Link href="/shop" className="text-sm underline underline-offset-4">Clear filters</Link>}
      </div>
      {matches.length ? <CampaignRange styles={matches} products={products} /> : (
        <div className="border border-line p-8">
          <h2 className="display text-3xl">No styles match these filters</h2>
          <Link href="/shop" className="mt-4 inline-block border-b text-sm">Browse all ready-to-wear</Link>
        </div>
      )}
      {live.length > 0 && <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} query={query} setQuery={update} categories={categories} facets={facets(live)} resultCount={matches.length} />}
    </>
  );
}
