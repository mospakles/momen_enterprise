"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminStore } from "@/lib/admin/store";
import ProductCard from "@/components/product/ProductCard";
import ShopFilters, { EMPTY_FILTERS, ShopFilterState } from "@/components/shop/ShopFilters";

const SORT_OPTIONS = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
];

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const { products, categories } = useAdminStore();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ShopFilterState>(() => {
    const categorySlug = searchParams.get("category");
    const genderParam = searchParams.get("gender");
    let categoryNames: string[] = [];
    const cat = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
    if (cat) {
      // A parent category (e.g. "Accessories") expands to all its children
      // so the "Accessories" homepage card shows every accessory subtype.
      const children = categories.filter((c) => c.parentId === cat.id);
      categoryNames = children.length > 0 ? children.map((c) => c.name) : [cat.name];
    }
    return {
      ...EMPTY_FILTERS,
      categories: categoryNames,
      gender: genderParam ? [genderParam] : [],
    };
  });
  const [sort, setSort] = useState("featured");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (p.publishStatus !== "published") return false;
      if (filters.categories.length && !filters.categories.includes(p.category)) return false;
      if (filters.collections.length && !p.collectionSlugs.some((c) => filters.collections.includes(c))) return false;
      if (filters.sizes.length && !p.sizes.some((s) => filters.sizes.includes(s))) return false;
      if (filters.gender.length && !filters.gender.includes(p.gender)) return false;
      if (p.price > filters.maxPrice) return false;
      if (filters.availability.length && !filters.availability.includes(p.stock === "low-stock" ? "in-stock" : p.stock)) return false;
      return true;
    });

    list = [...list];
    if (sort === "newest") list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "featured") list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));

    return list;
  }, [filters, sort, products]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-1">
        <p className="eyebrow">Shop Men&rsquo;s Clothing &amp; Accessories</p>
        <h1 className="font-display text-3xl sm:text-4xl">All Products</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <ShopFilters filters={filters} setFilters={setFilters} />
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="eyebrow border border-line px-4 py-2 lg:hidden"
            >
              Filters
            </button>
            <p className="hidden text-sm text-ink/60 sm:block">{filtered.length} pieces</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-line bg-ivory px-3 py-2 text-sm text-ink"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="border border-dashed border-line py-24 text-center">
              <p className="font-display text-xl">No pieces match those filters</p>
              <p className="mt-2 text-sm text-ink/60">Try widening your price range or clearing a filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[95] flex lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto h-full w-[85%] max-w-sm overflow-y-auto bg-ivory p-6">
            <ShopFilters filters={filters} setFilters={setFilters} onClose={() => setMobileFiltersOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
