"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";

export interface ShopFilterState {
  categories: string[]; // category names
  collections: string[]; // collection slugs
  sizes: string[];
  colors: string[];
  gender: string[]; // "men" | "unisex"
  maxPrice: number;
  availability: string[];
}

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const AVAILABILITY_OPTIONS = [
  { key: "in-stock", label: "In Stock" },
  { key: "made-to-order", label: "Made to Order" },
];

export const MAX_PRICE = 350000;
export const EMPTY_FILTERS: ShopFilterState = { categories: [], collections: [], sizes: [], colors: [], gender: [], maxPrice: MAX_PRICE, availability: [] };

export default function ShopFilters({
  filters,
  setFilters,
  onClose,
}: {
  filters: ShopFilterState;
  setFilters: (f: ShopFilterState) => void;
  onClose?: () => void;
}) {
  const { categories, collections } = useAdminStore();
  const clothingCategories = categories.filter((c) => !c.parentId && c.slug !== "accessories");
  const accessoryCategories = categories.filter((c) => c.parentId);

  const toggle = (key: "categories" | "collections" | "sizes" | "colors" | "availability" | "gender", value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ ...filters, [key]: next });
  };

  return (
    <div className="flex flex-col gap-8">
      {onClose && (
        <div className="flex items-center justify-between lg:hidden">
          <p className="font-display text-xl">Filters</p>
          <button onClick={onClose} aria-label="Close filters" className="text-ink/60">✕</button>
        </div>
      )}

      <FilterGroup title="Clothing">
        {clothingCategories.map((c) => (
          <Checkbox key={c.slug} label={c.name} checked={filters.categories.includes(c.name)} onChange={() => toggle("categories", c.name)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Accessories">
        {accessoryCategories.map((c) => (
          <Checkbox key={c.slug} label={c.name} checked={filters.categories.includes(c.name)} onChange={() => toggle("categories", c.name)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Collection">
        {collections.map((c) => (
          <Checkbox key={c.slug} label={c.name} checked={filters.collections.includes(c.slug)} onChange={() => toggle("collections", c.slug)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Fit For">
        <Checkbox label="Men" checked={filters.gender.includes("men")} onChange={() => toggle("gender", "men")} />
        <Checkbox label="Unisex" checked={filters.gender.includes("unisex")} onChange={() => toggle("gender", "unisex")} />
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggle("sizes", s)}
              className={`border px-3 py-1.5 text-xs ${
                filters.sizes.includes(s) ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <input
          type="range"
          min={0}
          max={MAX_PRICE}
          step={5000}
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-brass"
        />
        <p className="mt-1 text-xs text-ink/60">Up to ₦{filters.maxPrice.toLocaleString()}</p>
      </FilterGroup>

      <FilterGroup title="Availability">
        {AVAILABILITY_OPTIONS.map((a) => (
          <Checkbox
            key={a.key}
            label={a.label}
            checked={filters.availability.includes(a.key)}
            onChange={() => toggle("availability", a.key)}
          />
        ))}
      </FilterGroup>

      <button onClick={() => setFilters(EMPTY_FILTERS)} className="eyebrow self-start text-clay hover:text-brass">
        Clear All Filters
      </button>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line pb-6">
      <button onClick={() => setOpen((v) => !v)} className="mb-3 flex w-full items-center justify-between">
        <p className="eyebrow">{title}</p>
        <span className="text-xs text-ink/50">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="space-y-2.5">{children}</div>}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm capitalize text-ink/75 hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-brass" />
      {label}
    </label>
  );
}
