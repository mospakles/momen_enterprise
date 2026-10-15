"use client";

// Size guide: measurement chart, how to measure, and a simple fit finder
// (height + weight + preferred fit → a suggested size from this product's
// own size run). Uses the admin-authored chart when the product has one.

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import MeasurementSilhouette from "@/components/measurement/MeasurementSilhouette";

// General momen. guide for letter sizes, body measurements in cm.
const LETTER_CHART = [
  { size: "XS", chest: "84–89", waist: "70–75", hip: "86–91" },
  { size: "S", chest: "90–95", waist: "76–81", hip: "92–97" },
  { size: "M", chest: "96–101", waist: "82–87", hip: "98–103" },
  { size: "L", chest: "102–108", waist: "88–94", hip: "104–110" },
  { size: "XL", chest: "109–116", waist: "95–102", hip: "111–118" },
  { size: "XXL", chest: "117–124", waist: "103–110", hip: "119–126" },
  { size: "XXXL", chest: "125–132", waist: "111–118", hip: "127–134" },
];
const LETTERS = LETTER_CHART.map((r) => r.size);

const HOW_TO = [
  { key: "chest", title: "Chest", body: "Under the arms, around the fullest part of the chest. Keep the tape level and one finger loose." },
  { key: "waist", title: "Waist", body: "Around your natural waist, just above the navel. Breathe out normally — don't hold it in." },
  { key: "hip", title: "Hip", body: "Feet together, around the fullest part of the seat." },
  { key: "sleeveLength", title: "Sleeve", body: "From the shoulder point, over a slightly bent elbow, to the wrist bone." },
];

type Fit = "slim" | "regular" | "relaxed";

/** Starting-point estimate from height/weight. Returns an index into the
 * letter run (XS=0 … XXXL=6). */
function estimateLetterIndex(heightCm: number, weightKg: number, fit: Fit) {
  const bmi = weightKg / (heightCm / 100) ** 2;
  let idx = bmi < 19 ? 0 : bmi < 21 ? 1 : bmi < 24 ? 2 : bmi < 27 ? 3 : bmi < 30 ? 4 : bmi < 33 ? 5 : 6;
  if (heightCm >= 188) idx += 1;
  if (heightCm < 165 && idx > 0) idx -= 1;
  if (fit === "relaxed") idx += 1;
  if (fit === "slim" && bmi < 22.5 && idx > 0) idx -= 1;
  return Math.min(LETTERS.length - 1, Math.max(0, idx));
}

export default function SizeGuide({
  product,
  open,
  onClose,
  onPick,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  onPick?: (size: string) => void;
}) {
  const [tab, setTab] = useState<"finder" | "chart" | "measure">("finder");
  const usesLetters = product.sizes.some((s) => LETTERS.includes(s.toUpperCase()));

  return (
    <Modal open={open} onClose={onClose} title="Size & fit" wide>
      <div className="px-6 pt-4">
        <div role="tablist" aria-label="Size guide sections" className="flex gap-6 border-b border-line">
          {(
            [
              ["finder", "Fit finder"],
              ["chart", "Size chart"],
              ["measure", "How to measure"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`label -mb-px border-b py-3 transition-colors ${tab === key ? "border-ink text-ink" : "border-transparent text-ink/45 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8">
        {tab === "finder" && (usesLetters ? <FitFinder product={product} onPick={(s) => { onPick?.(s); onClose(); }} /> : (
          <p className="text-sm text-ink/70">This piece uses numeric sizing — use the size chart, or choose made to measure for a guaranteed fit.</p>
        ))}

        {tab === "chart" && (
          <div>
            {product.sizeChart ? (
              <div className="prose-sm max-w-none whitespace-pre-line text-sm text-ink/75" dangerouslySetInnerHTML={{ __html: product.sizeChart }} />
            ) : (
              <>
                <p className="mb-5 text-sm text-ink/65">Body measurements in centimetres. Between sizes? Size up for a relaxed fall, down for a closer cut.</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <caption className="sr-only">General size chart in centimetres</caption>
                    <thead>
                      <tr className="border-b border-ink/80">
                        {["Size", "Chest", "Waist", "Hip"].map((h) => (
                          <th key={h} scope="col" className="label py-3 pr-4 text-ink/60">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {LETTER_CHART.filter((r) => !usesLetters || product.sizes.map((s) => s.toUpperCase()).includes(r.size)).map((r) => (
                        <tr key={r.size} className="border-b border-line">
                          <th scope="row" className="py-3 pr-4 font-medium">{r.size}</th>
                          <td className="py-3 pr-4 tabular-nums text-ink/75">{r.chest}</td>
                          <td className="py-3 pr-4 tabular-nums text-ink/75">{r.waist}</td>
                          <td className="py-3 pr-4 tabular-nums text-ink/75">{r.hip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "measure" && (
          <div className="grid gap-8 sm:grid-cols-[180px_1fr]">
            <MeasurementSilhouette className="mx-auto h-72 text-ink/60" />
            <ol className="space-y-5">
              {HOW_TO.map((h, i) => (
                <li key={h.key} className="grid grid-cols-[2rem_1fr]">
                  <span className="display text-2xl text-clay">{i + 1}</span>
                  <span>
                    <span className="block font-medium">{h.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink/70">{h.body}</span>
                  </span>
                </li>
              ))}
              <li className="border-t border-line pt-5 text-sm text-ink/65">
                Measure over a thin shirt, with a soft tape. Better still, let a tailor do it — book a fitting or use our guided measuring.
              </li>
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FitFinder({ product, onPick }: { product: Product; onPick: (size: string) => void }) {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fit, setFit] = useState<Fit>("regular");

  const result = useMemo(() => {
    const h = Number(height);
    const w = Number(weight);
    if (!(h >= 140 && h <= 220 && w >= 40 && w <= 200)) return null;
    const idx = estimateLetterIndex(h, w, fit);
    // Snap to the nearest size this product is actually cut in.
    const offered = product.sizes.map((s) => ({ s, i: LETTERS.indexOf(s.toUpperCase()) })).filter((x) => x.i >= 0);
    if (offered.length === 0) return null;
    const best = offered.reduce((a, b) => (Math.abs(b.i - idx) < Math.abs(a.i - idx) ? b : a));
    return { size: best.s, exact: best.i === idx };
  }, [height, weight, fit, product.sizes]);

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      <div className="space-y-5">
        <p className="text-sm text-ink/70">Three answers for a suggested size in {product.name}.</p>
        <NumberField label="Height" unit="cm" value={height} onChange={setHeight} min={140} max={220} />
        <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} min={40} max={200} />
        <fieldset>
          <legend className="label mb-2 text-ink/60">Preferred fit</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["slim", "regular", "relaxed"] as const).map((f) => (
              <label
                key={f}
                className={`cursor-pointer border px-3 py-2.5 text-center text-sm capitalize transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-brass)] ${fit === f ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
              >
                <input type="radio" name="fit" value={f} checked={fit === f} onChange={() => setFit(f)} className="sr-only" />
                {f}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col justify-center bg-bone p-6" aria-live="polite">
        {result ? (
          <>
            <p className="label text-clay">We suggest</p>
            <p className="display mt-2 text-6xl">{result.size}</p>
            <p className="mt-3 text-sm text-ink/70">
              {result.exact ? "Your closest match in this piece's size run." : "The nearest size we cut this piece in."} A starting point — for a guaranteed fit, choose made to measure.
            </p>
            <button type="button" onClick={() => onPick(result.size)} className="mt-6 self-start bg-ink px-6 py-3 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta">
              Select {result.size}
            </button>
          </>
        ) : (
          <p className="text-sm text-ink/60">Enter your height and weight to see a suggestion.</p>
        )}
      </div>
    </div>
  );
}

function NumberField({ label, unit, value, onChange, min, max }: { label: string; unit: string; value: string; onChange: (v: string) => void; min: number; max: number }) {
  const n = Number(value);
  const invalid = value !== "" && !(n >= min && n <= max);
  return (
    <label className="block">
      <span className="label text-ink/60">{label}</span>
      <span className={`mt-1 flex items-baseline border-b ${invalid ? "border-error" : "border-line focus-within:border-ink"}`}>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          className="w-full bg-transparent py-2 text-lg outline-none"
        />
        <span className="text-sm text-ink/50">{unit}</span>
      </span>
      {invalid && <span className="mt-1 block text-xs text-error">Enter a value between {min} and {max} {unit}.</span>}
    </label>
  );
}
