"use client";

// Lightweight, dependency-free SVG charts built to the dataviz skill's spec:
// thin marks, 2px lines, recessive gridlines, a legend for ≥2 series, direct
// hover tooltips, and the validated categorical/status palette from
// `chart-palette.ts`. No dual axes, no rainbow fills, no color-only meaning.

import { useMemo, useState } from "react";
import { CATEGORICAL, CHART_CHROME, STATUS } from "./chart-palette";

const STATUS_PALETTE = [STATUS.good, STATUS.warning, STATUS.serious, STATUS.critical, STATUS.neutral];

/* ─────────────────────────────── Legend ─────────────────────────────── */

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink/60">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────── Line chart ─────────────────────────────── */

export interface LineSeries {
  label: string;
  color?: string;
  values: number[];
}

export function LineChart({
  labels,
  series,
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const padding = { top: 16, right: 12, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const min = Math.min(0, ...allValues);

  const x = (i: number) => padding.left + (labels.length <= 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - ((v - min) / (max - min || 1)) * innerH;

  const paths = series.map((s, si) => {
    const color = s.color ?? CATEGORICAL[si % CATEGORICAL.length];
    const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
    return { ...s, color, d };
  });

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((relX - padding.left) / innerW) * (labels.length - 1));
    setHover(Math.max(0, Math.min(labels.length - 1, idx)));
  }

  const gridLines = 4;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Line chart" preserveAspectRatio="none" style={{ height }}>
        <title>{series.map((s) => s.label).join(", ")}</title>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const gy = padding.top + (innerH / gridLines) * i;
          return <line key={i} x1={padding.left} x2={width - padding.right} y1={gy} y2={gy} stroke={CHART_CHROME.grid} strokeWidth={1} />;
        })}
        {paths.map((p) => (
          <path key={p.label} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {paths.map((p) =>
          p.values.map((v, i) => (
            <circle
              key={`${p.label}-${i}`}
              cx={x(i)}
              cy={y(v)}
              r={hover === i ? 4 : 0}
              fill={p.color}
              stroke="#fff"
              strokeWidth={1.5}
              className="transition-all"
            />
          ))
        )}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padding.top} y2={height - padding.bottom} stroke={CHART_CHROME.baseline} strokeWidth={1} strokeDasharray="3 3" />}
        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink/40">
        {labels.map((l, i) => (
          <span key={i} className={labels.length > 10 && i % Math.ceil(labels.length / 8) !== 0 ? "invisible" : ""}>
            {l}
          </span>
        ))}
      </div>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-sm border border-line bg-ink px-2.5 py-1.5 text-xs text-ivory shadow-lg"
          style={{ left: `${(x(hover) / width) * 100}%` }}
        >
          <p className="font-medium">{labels[hover]}</p>
          {paths.map((p) => (
            <p key={p.label} className="flex items-center gap-1.5 text-stone-light">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
              {p.label}: {formatValue(p.values[hover])}
            </p>
          ))}
        </div>
      )}
      <div className="mt-2">
        <ChartLegend items={paths.map((p) => ({ label: p.label, color: p.color }))} />
      </div>
    </div>
  );
}

/* ─────────────────────────────── Bar chart ─────────────────────────────── */

export interface BarSeries {
  label: string;
  color?: string;
  values: number[];
}

export function BarChart({
  labels,
  series,
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [hover, setHover] = useState<{ group: number; s: number } | null>(null);
  const width = 640;
  const padding = { top: 16, right: 12, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  const groupW = innerW / labels.length;
  const barGap = 3;
  const barW = Math.max(4, (groupW - barGap * (series.length + 1)) / series.length);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Bar chart" preserveAspectRatio="none" style={{ height }}>
        <title>{series.map((s) => s.label).join(", ")}</title>
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke={CHART_CHROME.baseline} strokeWidth={1} />
        {labels.map((_, gi) =>
          series.map((s, si) => {
            const color = s.color ?? CATEGORICAL[si % CATEGORICAL.length];
            const v = s.values[gi] ?? 0;
            const barH = (v / max) * innerH;
            const bx = padding.left + gi * groupW + barGap + si * (barW + barGap);
            const by = height - padding.bottom - barH;
            const isHover = hover?.group === gi && hover?.s === si;
            return (
              <rect
                key={`${gi}-${si}`}
                x={bx}
                y={by}
                width={barW}
                height={Math.max(1, barH)}
                rx={2}
                fill={color}
                opacity={hover && !isHover ? 0.55 : 1}
                onMouseEnter={() => setHover({ group: gi, s: si })}
                onMouseLeave={() => setHover(null)}
              />
            );
          })
        )}
      </svg>
      <div className="mt-1 flex text-[10px] text-ink/40" style={{ paddingLeft: padding.left, paddingRight: padding.right }}>
        {labels.map((l, i) => (
          <span key={i} style={{ width: `${(1 / labels.length) * 100}%` }} className="truncate text-center">
            {l}
          </span>
        ))}
      </div>
      {hover && (
        <div className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 rounded-sm border border-line bg-ink px-2.5 py-1.5 text-xs text-ivory shadow-lg">
          <p className="font-medium">{labels[hover.group]}</p>
          <p className="text-stone-light">
            {series[hover.s].label}: {formatValue(series[hover.s].values[hover.group] ?? 0)}
          </p>
        </div>
      )}
      <div className="mt-2">
        <ChartLegend items={series.map((s, i) => ({ label: s.label, color: s.color ?? CATEGORICAL[i % CATEGORICAL.length] }))} />
      </div>
    </div>
  );
}

/* ─────────────────────────────── Donut chart ─────────────────────────────── */

export function DonutChart({
  data,
  size = 160,
  thickness = 22,
  formatValue = (v: number) => String(v),
  statusColors = false,
}: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  formatValue?: (v: number) => string;
  statusColors?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(
    () =>
      // Functional prefix-sum (no mutated accumulator) — segment counts are
      // tiny, so the O(n^2) spread is negligible.
      data.reduce<Array<(typeof data)[number] & { color: string; frac: number; dash: number; offset: number }>>((acc, d, i) => {
        const color = d.color ?? (statusColors ? STATUS_PALETTE[i % STATUS_PALETTE.length] : CATEGORICAL[i % CATEGORICAL.length]);
        const frac = d.value / total;
        const prevOffset = i === 0 ? 0 : acc[i - 1].offset + acc[i - 1].dash;
        return [...acc, { ...d, color, frac, dash: frac * circumference, offset: prevOffset }];
      }, []),
    [data, total, circumference, statusColors]
  );

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Donut chart">
          <title>{data.map((d) => `${d.label}: ${d.value}`).join(", ")}</title>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={CHART_CHROME.grid} strokeWidth={thickness} />
          {segments.map((s, i) => (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? thickness + 3 : thickness}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-lg leading-none">{hover !== null ? formatValue(segments[hover].value) : formatValue(total)}</p>
          <p className="mt-1 text-[10px] text-ink/40">{hover !== null ? segments[hover].label : "Total"}</p>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        {segments.map((s, i) => (
          <button
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <span className="inline-flex items-center gap-1.5 text-ink/70">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="text-ink/50">{formatValue(s.value)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Horizontal bar list ─────────────────────────────── */
// For categorical breakdowns with many rows (order status, top products) —
// reads better than a crowded donut. Colors are per-row so callers can pass
// semantic status colors; falls back to the categorical ramp in order.

export function HorizontalBars({
  data,
  formatValue = (v: number) => String(v),
}: {
  data: { label: string; value: number; color?: string }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3 text-xs">
          <span className="w-32 shrink-0 truncate text-ink/60" title={d.label}>
            {d.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ivory-deep">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? CATEGORICAL[i % CATEGORICAL.length] }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-ink/50">{formatValue(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────── Sparkline ─────────────────────────────── */

export function Sparkline({ values, color = "#A3803E", height = 36, width = 100 }: { values: number[]; color?: string; height?: number; width?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(" ");
  const trendUp = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" opacity={trendUp ? 1 : 0.7} />
    </svg>
  );
}
