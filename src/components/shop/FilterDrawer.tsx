"use client";

import { Modal } from "@/components/ui/Modal";
import type { Category } from "@/lib/types";
import { OCCASIONS } from "@/lib/occasions";
import { formatNaira } from "@/lib/format";
import type { ShopQuery } from "@/lib/shop-filters";

type ListKey = "category" | "fabric" | "color" | "size" | "gender" | "availability";

/** Slide-in filter drawer. Every change applies immediately (the grid
 * reflows behind the drawer); the footer button simply closes it. */
export default function FilterDrawer({
  open,
  onClose,
  query,
  setQuery,
  categories,
  facets,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  query: ShopQuery;
  setQuery: (q: ShopQuery) => void;
  categories: Category[];
  facets: { colors: { name: string; hex: string }[]; sizes: string[]; fabrics: string[]; maxPrice: number };
  resultCount: number;
}) {
  const toggle = (key: ListKey, value: string) => {
    const current = query[key];
    setQuery({ ...query, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };
  const garments = categories.filter((c) => c.publishStatus === "published" || !c.publishStatus);

  return (
    <Modal open={open} onClose={onClose} title="Refine" side>
      <div className="divide-y divide-line px-6">
        <Group title="Occasion">
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.filter((o) => o.matches).map((o) => (
              <Chip key={o.slug} selected={query.occasion === o.slug} onClick={() => setQuery({ ...query, occasion: query.occasion === o.slug ? "" : o.slug })}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Garment">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {garments.map((c) => (
              <Check key={c.slug} label={c.name} checked={query.category.includes(c.slug)} onChange={() => toggle("category", c.slug)} />
            ))}
          </div>
        </Group>

        {facets.fabrics.length > 0 && (
          <Group title="Cloth">
            <div className="flex flex-wrap gap-2">
              {facets.fabrics.map((f) => (
                <Chip key={f} selected={query.fabric.includes(f)} onClick={() => toggle("fabric", f)}>
                  {f}
                </Chip>
              ))}
            </div>
          </Group>
        )}

        <Group title="Colour">
          <div className="grid grid-cols-4 gap-3">
            {facets.colors.map((c) => {
              const on = query.color.includes(c.name);
              return (
                <button key={c.name} type="button" aria-pressed={on} onClick={() => toggle("color", c.name)} className="flex flex-col items-center gap-1.5 text-[11px] text-ink/70">
                  <span
                    className={`h-8 w-8 rounded-full border border-ink/15 transition-shadow ${on ? "shadow-[0_0_0_3px_var(--color-ivory),0_0_0_4px_var(--color-ink)]" : ""}`}
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className={on ? "text-ink" : ""}>{c.name}</span>
                </button>
              );
            })}
          </div>
        </Group>

        <Group title="Size">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <Chip key={s} selected={query.size.includes(s)} onClick={() => toggle("size", s)}>
                {s}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Price">
          <label className="block">
            <span className="flex justify-between text-sm">
              <span className="text-ink/60">Up to</span>
              <span>{formatNaira(query.maxPrice ?? facets.maxPrice)}</span>
            </span>
            <input
              type="range"
              min={10000}
              max={facets.maxPrice || 350000}
              step={5000}
              value={query.maxPrice ?? facets.maxPrice}
              onChange={(e) => {
                const v = Number(e.target.value);
                setQuery({ ...query, maxPrice: v >= facets.maxPrice ? null : v });
              }}
              aria-label="Maximum price"
              className="mt-3 w-full accent-ink"
            />
          </label>
        </Group>

        <Group title="Availability & fit">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Check label="Ready to ship" checked={query.availability.includes("in-stock")} onChange={() => toggle("availability", "in-stock")} />
            <Check label="Made to order" checked={query.availability.includes("made-to-order")} onChange={() => toggle("availability", "made-to-order")} />
            <Check label="Menswear" checked={query.gender.includes("men")} onChange={() => toggle("gender", "men")} />
            <Check label="Womenswear" checked={query.gender.includes("women")} onChange={() => toggle("gender", "women")} />
            <Check label="Unisex" checked={query.gender.includes("unisex")} onChange={() => toggle("gender", "unisex")} />
          </div>
        </Group>
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t border-line bg-ivory px-6 py-4">
        <button
          type="button"
          onClick={() => setQuery({ ...query, occasion: "", category: [], fabric: [], color: [], size: [], gender: [], availability: [], maxPrice: null })}
          className="label px-2 text-ink/60 hover:text-ink"
        >
          Clear all
        </button>
        <button type="button" onClick={onClose} className="flex-1 bg-ink py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta">
          Show {resultCount} {resultCount === 1 ? "piece" : "pieces"}
        </button>
      </div>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="py-6">
      <legend className="label mb-4 float-left w-full text-ink/60">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-w-11 rounded-full border px-4 py-2 text-sm transition-colors ${selected ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
    >
      {children}
    </button>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink/80 hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-ink" />
      {label}
    </label>
  );
}
