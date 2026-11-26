"use client";

// Ready-to-wear size guide for one product. The chart itself is the admin's
// own text (Admin → Products → Size chart), never invented here. When it is
// written as rows (e.g. "Size | Chest | Waist"), it becomes a real table with a
// "find my size" helper; any other text is shown as written. The "How to
// measure" tab only lists measurements that matter for this garment.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import MeasurementMannequin from "@/components/measurement/MeasurementMannequin";
import MeasurementInstructions from "@/components/measurement/MeasurementInstructions";
import { useAdminStore } from "@/lib/admin/store";
import { fieldGuide } from "@/lib/measurement-guide";
import { sizingModeOf } from "@/lib/product-utils";

type ChartKind = "body" | "garment" | "unknown";
interface ParsedChart {
  notes: string[];
  header: string[];
  rows: string[][];
  kind: ChartKind;
  unit?: "cm" | "in";
  /** Guide key per column (undefined for the size column / unknown headings). */
  keys: (string | undefined)[];
}

const HEADER_KEYS: [RegExp, string][] = [
  [/chest|bust/i, "chest"],
  [/shoulder/i, "shoulder"],
  [/sleeve/i, "sleeveLength"],
  [/neck|collar/i, "neck"],
  [/waist/i, "waist"],
  [/hip|seat/i, "hip"],
  [/thigh|lap/i, "thigh"],
  [/inseam|inside leg/i, "inseam"],
  [/trouser length|outseam|outside leg|leg length/i, "trouserLength"],
  [/stomach|belly/i, "stomach"],
  [/length/i, "length"],
];

const RELEVANT: Record<string, string[]> = {
  top: ["chest", "shoulder", "sleeveLength", "length", "neck"],
  trouser: ["waist", "hip", "thigh", "trouserLength"],
  set: ["chest", "shoulder", "sleeveLength", "length", "waist", "hip", "trouserLength"],
  agbada: ["chest", "shoulder", "sleeveLength", "length", "waist", "hip", "trouserLength"],
  accessory: [],
};

function plainText(html: string) {
  return html
    .replace(/<\/(?:p|div|li|tr|h[1-6])>|<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function splitRow(line: string) {
  const sep = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
  return line
    .split(sep)
    .map((c) => c.trim())
    .filter((c, i, all) => c !== "" || (i > 0 && i < all.length - 1));
}

export function parseSizeChart(raw: string): ParsedChart {
  const lines = plainText(raw).split(/\n/).map((l) => l.trim()).filter(Boolean);
  const notes: string[] = [];
  const table: string[][] = [];
  for (const line of lines) {
    if (/^[|\s:-]+$/.test(line)) continue; // markdown divider row
    const cells = splitRow(line);
    if (cells.length >= 2 && (line.includes("|") || line.includes("\t") || (line.match(/,/g) ?? []).length >= 2)) table.push(cells);
    else notes.push(line);
  }
  const all = lines.join(" ");
  const kind: ChartKind = /garment|finished|laid flat|flat/i.test(all) ? "garment" : /body/i.test(all) ? "body" : "unknown";
  const unit = /\b(in|inch|inches)\b|"/i.test(all) && !/\bcm\b|centimet/i.test(all) ? "in" : /\bcm\b|centimet/i.test(all) ? "cm" : undefined;
  const [header = [], ...rows] = table;
  const keys = header.map((h, i) => (i === 0 ? undefined : HEADER_KEYS.find(([re]) => re.test(h))?.[1]));
  return { notes, header, rows: rows.filter((r) => r.length > 1), kind, unit, keys };
}

/** "96-101", "96–101" or "98" → [min, max]. */
function range(cell: string): [number, number] | null {
  const nums = (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (!nums.length) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

function findSize(chart: ParsedChart, column: number, value: number) {
  const ranges = chart.rows.map((r) => range(r[column] ?? "")).map((r, i) => ({ r, size: chart.rows[i][0] })).filter((x): x is { r: [number, number]; size: string } => Boolean(x.r));
  if (!ranges.length) return null;
  const inside = ranges.filter((x) => value >= x.r[0] - 0.5 && value <= x.r[1] + 0.5);
  if (inside.length) return { size: inside[inside.length - 1].size, between: inside.length > 1 ? inside.map((x) => x.size) : undefined };
  const sorted = [...ranges].sort((a, b) => a.r[0] - b.r[0]);
  if (value < sorted[0].r[0]) return { size: sorted[0].size, below: true };
  if (value > sorted[sorted.length - 1].r[1]) return { size: sorted[sorted.length - 1].size, above: true };
  const upper = sorted.find((x) => x.r[0] > value)!;
  const lower = [...sorted].reverse().find((x) => x.r[1] < value)!;
  return { size: upper.size, between: [lower.size, upper.size] };
}

export default function SizeGuide({ product, open, onClose, onPick }: { product: Product; open: boolean; onClose: () => void; onPick?: (size: string) => void }) {
  const { measurementFieldDefs } = useAdminStore();
  const chart = useMemo(() => (product.sizeChart?.trim() ? parseSizeChart(product.sizeChart) : null), [product.sizeChart]);
  const hasTable = Boolean(chart && chart.header.length > 1 && chart.rows.length > 0);

  // Measurements to explain: the chart's own columns first, then the ones
  // that matter for this garment.
  const relevant = useMemo(() => {
    const fromChart = (chart?.keys ?? []).filter((k): k is string => Boolean(k));
    return [...new Set([...fromChart, ...(RELEVANT[product.garment] ?? [])])];
  }, [chart, product.garment]);
  const guides = useMemo(() => relevant.map((k) => fieldGuide(k, measurementFieldDefs)), [relevant, measurementFieldDefs]);

  // The column to size by: chest for tops, waist for trousers.
  const primaryColumn = useMemo(() => {
    if (!chart || !hasTable || chart.kind === "garment") return -1;
    const order = product.garment === "trouser" ? ["waist", "hip"] : ["chest", "waist"];
    for (const k of order) {
      const i = chart.keys.indexOf(k);
      if (i > 0 && chart.rows.some((r) => range(r[i] ?? ""))) return i;
    }
    return -1;
  }, [chart, hasTable, product.garment]);

  const [tab, setTab] = useState<"chart" | "measure">("chart");
  const [active, setActive] = useState<string | undefined>(relevant[0]);
  const [mine, setMine] = useState("");
  const activeGuide = guides.find((g) => g.key === active) ?? guides[0];
  const unit = chart?.unit ?? "cm";
  const mineValue = Number(mine.replace(",", "."));
  const match = primaryColumn > 0 && mineValue > 0 ? findSize(chart!, primaryColumn, mineValue) : null;
  const offered = new Set(product.sizes);
  const pick = (size: string) => {
    if (!onPick || !offered.has(size)) return;
    onPick(size);
    onClose();
  };

  const tabs = [
    ["chart", "Size chart"],
    ["measure", "How to measure"],
  ] as const;

  return (
    <Modal open={open} onClose={onClose} title="Size & fit" wide>
      <div className="px-6 pt-4">
        <div role="tablist" aria-label="Size guide sections" className="flex gap-6 border-b border-line">
          {tabs.map(([key, text]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`size-tab-${key}`}
              aria-controls={`size-panel-${key}`}
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`label -mb-px min-h-11 border-b py-3 transition-colors ${tab === key ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {tab === "chart" && (
        <div id="size-panel-chart" role="tabpanel" aria-labelledby="size-tab-chart" className="space-y-6 px-6 py-6">
          <p className="text-sm text-ink/70">
            Sizes for <span className="font-medium text-ink">{product.name}</span>: {product.sizes.join(", ") || "one size"}.
          </p>

          {chart && (
            <div className={`border-l-2 px-4 py-3 text-sm leading-relaxed ${chart.kind === "garment" ? "border-clay bg-bone/60" : "border-brass bg-bone/60"}`}>
              {chart.kind === "garment" ? (
                <>
                  <p className="font-medium">These are garment measurements.</p>
                  <p className="mt-1 text-ink/70">They measure the finished piece, which is cut slightly bigger than the body so you can move. To compare, lay a similar piece you own flat and measure it the same way.</p>
                </>
              ) : chart.kind === "body" ? (
                <>
                  <p className="font-medium">These are body measurements.</p>
                  <p className="mt-1 text-ink/70">Measure yourself, not your clothes, and pick the size that matches. The piece is cut with room to move on top of these numbers.</p>
                </>
              ) : (
                <p className="text-ink/70">Measurements in {unit === "in" ? "inches" : "centimetres"}. Unsure whether a number is for your body or the garment? Ask us before ordering.</p>
              )}
            </div>
          )}

          {hasTable && chart ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Size chart for {product.name}, {chart.kind === "garment" ? "garment" : "body"} measurements in {unit}
                </caption>
                <thead>
                  <tr className="border-b border-ink/80">
                    {chart.header.map((h, i) => (
                      <th key={i} scope="col" className="label py-3 pr-4 text-ink/60">
                        {h}
                      </th>
                    ))}
                    {onPick && <th scope="col" className="hidden sm:table-cell"><span className="sr-only">Choose</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {chart.rows.map((row, ri) => {
                    const highlighted = match?.size === row[0];
                    return (
                      <tr key={ri} className={`border-b border-line ${highlighted ? "bg-bone" : ""}`}>
                        {row.map((cell, ci) =>
                          ci === 0 ? (
                            <th key={ci} scope="row" className="py-3 pr-4 font-medium">
                              {cell}
                            </th>
                          ) : (
                            <td key={ci} className="py-3 pr-4 tabular-nums text-ink/80">
                              {cell}
                            </td>
                          )
                        )}
                        {onPick && (
                          <td className="hidden py-2 text-right sm:table-cell">
                            {offered.has(row[0]) && (
                              <button type="button" onClick={() => pick(row[0])} className="min-h-10 border border-line px-3 text-xs hover:border-ink">
                                Choose {row[0]}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : chart ? (
            <div className="whitespace-pre-wrap border border-line p-4 text-sm leading-relaxed text-ink/80">{chart.notes.join("\n")}</div>
          ) : (
            <div className="border border-line bg-bone/50 p-5 text-sm">
              <p className="font-medium">We&rsquo;re still adding the measurements for this piece.</p>
              <p className="mt-2 max-w-2xl leading-relaxed text-ink/70">
                Message us with your chest and waist measurements (see How to measure) and we&rsquo;ll tell you which size to choose.
                {sizingModeOf(product) === "both" ? " Or choose “Made to measure” and we’ll cut it to your body." : ""}
              </p>
              <Link href="/contact" onClick={onClose} className="link-line mt-3 inline-block text-clay">
                Ask about sizing
              </Link>
            </div>
          )}

          {hasTable && chart && chart.notes.length > 0 && <p className="text-xs leading-relaxed text-ink/60">{chart.notes.join(" ")}</p>}

          {primaryColumn > 0 && chart && (
            <div className="border border-line p-4">
              <label htmlFor="my-size" className="text-sm font-medium">
                Find my size: your {chart.header[primaryColumn].toLowerCase()} ({unit})
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  id="my-size"
                  inputMode="decimal"
                  value={mine}
                  onChange={(e) => setMine(e.target.value.replace(/[^\d.,]/g, ""))}
                  className="w-28 border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-ink"
                  placeholder="0"
                />
                <button type="button" onClick={() => {
                    setActive(chart.keys[primaryColumn]);
                    setTab("measure");
                  }} className="text-xs text-clay underline underline-offset-4">
                  How do I measure this?
                </button>
              </div>
              <p className="mt-3 text-sm" aria-live="polite">
                {match ? (
                  <>
                    {match.between ? (
                      <>
                        You&rsquo;re between <strong>{match.between.join(" and ")}</strong>. Choose <strong>{match.between[0]}</strong> for a closer fit or{" "}
                        <strong>{match.between[match.between.length - 1]}</strong> for a relaxed fit.
                      </>
                    ) : match.below ? (
                      <>Smaller than our smallest size. {sizingModeOf(product) === "both" ? "Choose Made to measure for a perfect fit." : `Try ${match.size}, or ask us.`}</>
                    ) : match.above ? (
                      <>Larger than our largest size. {sizingModeOf(product) === "both" ? "Choose Made to measure for a perfect fit." : `Try ${match.size}, or ask us.`}</>
                    ) : (
                      <>
                        Your size is <strong>{match.size}</strong>.
                      </>
                    )}{" "}
                    {onPick && offered.has(match.size) && (
                      <button type="button" onClick={() => pick(match.size)} className="ml-1 text-clay underline underline-offset-4">
                        Select {match.size}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-ink/55">Enter a number to see your size.</span>
                )}
              </p>
            </div>
          )}

          <div className="grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium">Between two sizes?</p>
              <p className="mt-1 leading-relaxed text-ink/70">
                {product.garment === "trouser"
                  ? "Go by your waist. If it falls between sizes, choose the larger size and have the waist taken in. Hips and thighs are harder to let out."
                  : "Go by your chest. Choose the smaller size for a closer, sharper fit or the larger one for an easy, relaxed drape. Kaftans and agbada are meant to fall loosely."}
              </p>
            </div>
            <div>
              <p className="font-medium">Want it exact?</p>
              <p className="mt-1 leading-relaxed text-ink/70">
                {sizingModeOf(product) === "both"
                  ? "This piece can also be cut to your measurements. Choose “Made to measure” on the product page and we’ll guide you."
                  : "Our bespoke pieces are cut to your measurements, with a guided measuring tool."}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "measure" && (
        <div id="size-panel-measure" role="tabpanel" aria-labelledby="size-tab-measure" className="grid gap-6 px-6 py-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="mx-auto w-full max-w-[18rem] md:max-w-none">
            <MeasurementMannequin placement={activeGuide?.placement} label={activeGuide?.label} zoomOnSmallScreens />
          </div>
          <div>
            <p className="text-sm leading-relaxed text-ink/70">Use a soft tape over light clothing. Pick a measurement to see where the tape goes.</p>
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Measurements">
              {guides.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  role="tab"
                  aria-selected={activeGuide?.key === g.key}
                  onClick={() => setActive(g.key)}
                  className={`min-h-10 border px-3 text-sm transition-colors ${activeGuide?.key === g.key ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {activeGuide && (
              <div className="mt-5">
                <h3 className="display text-2xl">{activeGuide.label}</h3>
                <div className="mt-3">
                  <MeasurementInstructions guide={activeGuide} compact />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
