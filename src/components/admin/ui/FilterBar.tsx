"use client";

import { useState } from "react";

export function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-line bg-ivory py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brass"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30">⌕</span>
    </div>
  );
}

export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2.5">{children}</div>;
}

/* ─────────────────────────────── Date range filter ─────────────────────────────── */
// Preset rows per the dataviz skill's filter-control spec: today / 7 / 30 /
// 90(≈3mo) / 365(≈12mo) days, plus a custom range behind a hairline footer.

export type DateRangeKey = "today" | "7d" | "30d" | "3m" | "12m" | "custom";

export interface DateRange {
  key: DateRangeKey;
  from: Date;
  to: Date;
  label: string;
}

const PRESETS: { key: DateRangeKey; label: string; days: number }[] = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "3m", label: "Last 3 months", days: 90 },
  { key: "12m", label: "Last 12 months", days: 365 },
];

export function rangeFromPreset(key: DateRangeKey, custom?: { from: string; to: string }): DateRange {
  const now = new Date();
  const to = new Date(now);
  if (key === "custom" && custom) {
    return { key, from: new Date(custom.from), to: new Date(custom.to), label: "Custom range" };
  }
  const preset = PRESETS.find((p) => p.key === key) ?? PRESETS[2];
  const from = new Date(now);
  from.setDate(from.getDate() - preset.days);
  from.setHours(0, 0, 0, 0);
  return { key, from, to, label: preset.label };
}

export function DateRangeFilter({ value, onChange }: { value: DateRangeKey; onChange: (key: DateRangeKey, custom?: { from: string; to: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const activeLabel = value === "custom" ? "Custom range" : PRESETS.find((p) => p.key === value)?.label ?? "Last 30 days";

  return (
    <div className="relative">
      <button onClick={() => setOpen((s) => !s)} className="border border-line bg-ivory px-3 py-2.5 text-sm hover:border-brass">
        {activeLabel} ▾
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-56 border border-line bg-ivory shadow-lg">
          <ul className="py-1">
            {PRESETS.map((p) => (
              <li key={p.key}>
                <button
                  onClick={() => {
                    onChange(p.key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm hover:bg-ivory-deep/40 ${value === p.key ? "font-medium text-brass" : "text-ink/75"}`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center border ${value === p.key ? "border-brass bg-brass text-ivory" : "border-line"}`}>
                    {value === p.key && "✓"}
                  </span>
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="hairline space-y-2 p-3">
            <p className="eyebrow">Custom range</p>
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full border border-line bg-ivory px-2 py-1.5 text-xs" />
              <span className="text-ink/30">–</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full border border-line bg-ivory px-2 py-1.5 text-xs" />
            </div>
            <button
              disabled={!customFrom || !customTo}
              onClick={() => {
                onChange("custom", { from: customFrom, to: customTo });
                setOpen(false);
              }}
              className="w-full bg-ink py-1.5 text-xs text-ivory disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
