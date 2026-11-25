"use client";

// Step-by-step measuring for one style. The customer sees one measurement at
// a time (mannequin + plain-language steps + a single input), grouped by the
// garment piece it is for, then reviews everything before saving. People who
// already know their numbers can switch to quick entry, one piece at a time.
// Values, unit and position are controlled by the parent so nothing is lost
// when the customer leaves the step and comes back.

import { useEffect, useMemo, useRef, useState } from "react";
import type { MeasurementFieldDef, MeasurementUnit, MeasurementValues } from "@/lib/types";
import {
  fieldGuide,
  fieldProblem,
  formatRange,
  type FieldGuide,
  type FieldProblem,
  type MeasurementPlan,
} from "@/lib/measurement-guide";
import MeasurementMannequin from "./MeasurementMannequin";
import MeasurementInstructions from "./MeasurementInstructions";

export type FlowStage = "intro" | "measure" | "quick" | "review";
export interface FlowPosition {
  stage: FlowStage;
  /** Index into plan.fields (measure) or plan.pieces (quick). */
  index: number;
}

export function UnitToggle({ unit, onChange }: { unit: MeasurementUnit; onChange: (u: MeasurementUnit) => void }) {
  return (
    <div className="inline-flex border border-line text-xs" role="radiogroup" aria-label="Measurement unit">
      {(
        [
          ["cm", "Centimetres"],
          ["in", "Inches"],
        ] as const
      ).map(([u, name]) => (
        <button
          key={u}
          type="button"
          role="radio"
          aria-checked={unit === u}
          onClick={() => onChange(u)}
          className={`min-h-9 px-3 py-1.5 transition-colors ${unit === u ? "bg-ink text-ivory" : "text-ink/65 hover:text-ink"}`}
        >
          <span className="sm:hidden">{u}</span>
          <span className="hidden sm:inline">{name}</span>
        </button>
      ))}
    </div>
  );
}

function problemText(problem: FieldProblem, guide: FieldGuide, unit: MeasurementUnit) {
  if (problem === "missing") return `Enter your ${guide.label.toLowerCase()} to continue.`;
  if (problem === "invalid") return "Enter a number greater than zero.";
  if (problem === "unusual") {
    const range = formatRange(guide, unit);
    return `This looks unusual${range ? ` (most people are ${range})` : ""}. Check that you measured in ${unit === "cm" ? "centimetres" : "inches"} and that the tape followed the path shown. If it is right, carry on.`;
  }
  return null;
}

function ValueInput({
  guide,
  value,
  unit,
  onChange,
  onEnter,
  showProblem,
  autoFocus,
  size = "lg",
  onFocus,
}: {
  guide: FieldGuide;
  value: number | undefined;
  unit: MeasurementUnit;
  onChange: (v: number | undefined) => void;
  onEnter?: () => void;
  showProblem: boolean;
  autoFocus?: boolean;
  size?: "lg" | "sm";
  onFocus?: () => void;
}) {
  const id = `m-${guide.key}`;
  const problem = fieldProblem(guide, value, unit);
  const visibleProblem = problem === "unusual" || (showProblem && problem) ? problem : null;
  const message = problemText(visibleProblem, guide, unit);
  const range = formatRange(guide, unit);
  // Keep what the customer typed (e.g. "38." mid-entry) separate from the
  // parsed number, so typing a decimal point doesn't get swallowed.
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    if (Number(text.replace(",", ".")) !== value) setText(value === undefined ? "" : String(value));
  }
  return (
    <div>
      <label htmlFor={id} className={size === "lg" ? "label text-ink/60" : "text-sm font-medium"}>
        {size === "lg" ? `Your ${guide.label.toLowerCase()}` : guide.label}
        {!guide.required && <span className="ml-1 font-normal normal-case tracking-normal text-ink/45">(optional)</span>}
      </label>
      <div
        className={`mt-1.5 flex items-center border bg-ivory transition-colors focus-within:border-ink ${
          visibleProblem === "missing" || visibleProblem === "invalid" ? "border-error" : visibleProblem === "unusual" ? "border-terracotta" : "border-line"
        } ${size === "lg" ? "max-w-xs" : ""}`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={text}
          onFocus={onFocus}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,]/g, "");
            setText(raw);
            const parsed = Number(raw.replace(",", "."));
            onChange(raw === "" ? undefined : Number.isFinite(parsed) ? parsed : NaN);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter?.();
            }
          }}
          placeholder={range ? `e.g. ${range.split("–")[0]}` : "0"}
          aria-invalid={visibleProblem === "missing" || visibleProblem === "invalid"}
          aria-describedby={message ? `${id}-msg` : undefined}
          className={`w-full bg-transparent px-3 outline-none tabular-nums ${size === "lg" ? "py-3.5 text-2xl" : "py-2.5 text-base"}`}
        />
        <span className="pr-3 text-sm text-ink/50">{unit}</span>
      </div>
      {message && (
        <p id={`${id}-msg`} role={visibleProblem === "unusual" ? "status" : "alert"} className={`mt-2 max-w-md text-xs leading-relaxed ${visibleProblem === "unusual" ? "text-terracotta" : "text-error"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function GuidedMeasurementFlow({
  plan,
  defs,
  values,
  unit,
  position,
  onPositionChange,
  onChange,
  onUnitChange,
  onFinish,
  finishLabel = "Save measurements",
  busy = false,
  footer,
}: {
  plan: MeasurementPlan;
  defs: MeasurementFieldDef[];
  values: MeasurementValues;
  unit: MeasurementUnit;
  position: FlowPosition;
  onPositionChange: (p: FlowPosition) => void;
  onChange: (key: string, value: number | undefined) => void;
  onUnitChange: (u: MeasurementUnit) => void;
  onFinish: () => void;
  finishLabel?: string;
  busy?: boolean;
  /** Extra controls shown on the review screen above the save button. */
  footer?: React.ReactNode;
}) {
  const guides = useMemo(() => Object.fromEntries(plan.fields.map((k) => [k, fieldGuide(k, defs, plan)])), [plan, defs]);
  const pieceOfField = useMemo(() => Object.fromEntries(plan.pieces.flatMap((p, i) => p.fields.map((f) => [f, i]))), [plan]);
  const [showProblems, setShowProblems] = useState(false);
  const [quickFocus, setQuickFocus] = useState<string | undefined>();
  const topRef = useRef<HTMLDivElement>(null);

  const problems = plan.fields.map((k) => [k, fieldProblem(guides[k], values[k], unit)] as const);
  const blocking = problems.filter(([, p]) => p === "missing" || p === "invalid");
  const done = plan.fields.filter((k) => Number(values[k]) > 0).length;

  const { stage } = position;
  const fieldIndex = Math.min(position.index, plan.fields.length - 1);
  const pieceIndex = Math.min(position.index, plan.pieces.length - 1);

  // Bring the new step into view (not on first render).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage, position.index]);

  const go = (next: FlowPosition) => {
    setShowProblems(false);
    onPositionChange(next);
  };

  const pieceStatus = (i: number) => {
    const fields = plan.pieces[i].fields;
    const filled = fields.filter((k) => Number(values[k]) > 0).length;
    const ok = fields.every((k) => {
      const p = fieldProblem(guides[k], values[k], unit);
      return p !== "missing" && p !== "invalid";
    });
    return { filled, total: fields.length, ok };
  };

  const pieceStepper = (active?: number) => (
    <ol className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" aria-label="Garment pieces">
      {plan.pieces.map((piece, i) => {
        const s = pieceStatus(i);
        const current = i === active;
        return (
          <li key={piece.id} className="shrink-0">
            <button
              type="button"
              onClick={() => go(stage === "quick" ? { stage: "quick", index: i } : { stage: "measure", index: plan.fields.indexOf(piece.fields[0]) })}
              aria-current={current ? "step" : undefined}
              className={`flex min-h-10 items-center gap-2 border px-3 py-1.5 text-xs transition-colors ${
                current ? "border-ink bg-ink text-ivory" : s.ok ? "border-line bg-bone/60 text-ink" : "border-line text-ink/65 hover:border-ink"
              }`}
            >
              <span aria-hidden>{s.ok ? "✓" : i + 1}</span>
              <span className="font-medium">{piece.title}</span>
              <span className={current ? "text-ivory/70" : "text-ink/45"}>
                {s.filled}/{s.total}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  const progress = () => (
    <div className="mt-3">
      <div className="h-1 w-full bg-line" role="progressbar" aria-label="Measurements completed" aria-valuemin={0} aria-valuemax={plan.fields.length} aria-valuenow={done}>
        <div className="h-1 bg-brass transition-[width] duration-500" style={{ width: `${(done / Math.max(1, plan.fields.length)) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-ink/55">
        {done} of {plan.fields.length} measurements entered
      </p>
    </div>
  );

  /* ─────────── Intro ─────────── */
  if (stage === "intro") {
    return (
      <div ref={topRef} className="scroll-mt-24">
        <p className="label text-clay">Measuring for your {plan.styleName.toLowerCase()}</p>
        <h3 className="display mt-2 text-3xl">
          {plan.fields.length} measurements, about {Math.max(5, Math.round(plan.fields.length * 0.75))} minutes
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/70">
          We will take you through them one at a time. Each step shows exactly where the tape goes on the mannequin, with simple
          instructions. Your answers are saved as you go.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {plan.pieces.map((piece) => (
            <div key={piece.id} className="border border-line p-4">
              <p className="font-medium">{piece.title}</p>
              <p className="mt-0.5 text-xs text-ink/55">{piece.blurb}</p>
              <p className="mt-3 text-xs leading-relaxed text-ink/70">{piece.fields.map((k) => guides[k].label).join(" · ")}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 border-y border-line py-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <ul className="space-y-1.5 text-sm text-ink/75">
            <li>
              <span className="mr-2 text-clay" aria-hidden>
                ●
              </span>
              A soft measuring tape (the cloth kind a tailor uses)
            </li>
            <li>
              <span className="mr-2 text-clay" aria-hidden>
                ●
              </span>
              Light, close-fitting clothes, or a vest and shorts
            </li>
            <li>
              <span className="mr-2 text-clay" aria-hidden>
                ●
              </span>
              A friend to help with the back and length measurements
            </li>
          </ul>
          <div>
            <p className="label mb-2 text-ink/55">Measure in</p>
            <UnitToggle unit={unit} onChange={onUnitChange} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => go({ stage: "measure", index: done > 0 && done < plan.fields.length ? plan.fields.findIndex((k) => !(Number(values[k]) > 0)) : 0 })}
            className="min-h-12 bg-ink px-7 py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta"
          >
            {done > 0 ? "Continue measuring" : "Start, guide me step by step"}
          </button>
          <button type="button" onClick={() => go({ stage: "quick", index: 0 })} className="min-h-12 border border-ink px-6 py-3 text-sm hover:border-terracotta hover:text-terracotta">
            I already know my measurements
          </button>
          {done === plan.fields.length && (
            <button type="button" onClick={() => go({ stage: "review", index: 0 })} className="link-line text-sm text-clay sm:ml-2">
              Review all
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ─────────── Review ─────────── */
  if (stage === "review") {
    return (
      <div ref={topRef} className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label text-clay">Check before saving</p>
            <h3 className="display mt-2 text-3xl">Review your measurements</h3>
          </div>
          <UnitToggle unit={unit} onChange={onUnitChange} />
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/70">
          Our tailors cut your {plan.styleName.toLowerCase()} from these numbers. Tap Edit to change any of them.
        </p>

        <div className="mt-6 space-y-6">
          {plan.pieces.map((piece) => (
            <section key={piece.id} aria-labelledby={`review-${piece.id}`}>
              <h4 id={`review-${piece.id}`} className="flex items-baseline justify-between border-b border-ink/80 pb-2">
                <span className="font-medium">{piece.title}</span>
                <span className="text-xs text-ink/50">{piece.blurb}</span>
              </h4>
              <ul>
                {piece.fields.map((k) => {
                  const p = fieldProblem(guides[k], values[k], unit);
                  return (
                    <li key={k} className="flex min-h-12 items-center justify-between gap-3 border-b border-line py-2 text-sm">
                      <span>
                        {guides[k].label}
                        {p === "missing" && <span className="ml-2 text-xs text-error">Needed</span>}
                        {p === "invalid" && <span className="ml-2 text-xs text-error">Check this</span>}
                        {p === "unusual" && <span className="ml-2 text-xs text-terracotta">Unusual, please double-check</span>}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="tabular-nums">{Number(values[k]) > 0 ? `${values[k]} ${unit}` : guides[k].required ? "—" : "Skipped"}</span>
                        <button type="button" onClick={() => go({ stage: "measure", index: plan.fields.indexOf(k) })} className="min-h-10 px-1 text-xs text-clay underline underline-offset-4 hover:text-ink">
                          Edit <span className="sr-only">{guides[k].label}</span>
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {footer}

        {blocking.length > 0 && (
          <p role="alert" className="mt-5 text-sm text-error">
            Still needed: {blocking.map(([k]) => guides[k].label).join(", ")}.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={blocking.length > 0 || busy}
            onClick={onFinish}
            className="min-h-12 bg-ink px-7 py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Saving…" : finishLabel}
          </button>
          <button type="button" onClick={() => go({ stage: "measure", index: plan.fields.length - 1 })} className="min-h-12 border border-line px-6 py-3 text-sm hover:border-ink">
            Back
          </button>
        </div>
      </div>
    );
  }

  /* ─────────── Quick entry: one piece at a time ─────────── */
  if (stage === "quick") {
    const piece = plan.pieces[pieceIndex];
    const focusKey = quickFocus && piece.fields.includes(quickFocus) ? quickFocus : piece.fields[0];
    const pieceBlocking = piece.fields.filter((k) => {
      const p = fieldProblem(guides[k], values[k], unit);
      return p === "missing" || p === "invalid";
    });
    const last = pieceIndex === plan.pieces.length - 1;
    return (
      <div ref={topRef} className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {pieceStepper(pieceIndex)}
          <UnitToggle unit={unit} onChange={onUnitChange} />
        </div>
        {progress()}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <MeasurementMannequin placement={guides[focusKey].placement} label={guides[focusKey].label} />
            </div>
          </div>
          <div>
            <h3 className="display text-3xl">{piece.title}</h3>
            <p className="mt-1 text-sm text-ink/60">{piece.blurb} Tap “How?” next to any measurement to see where the tape goes.</p>
            <div className="mt-6 space-y-5">
              {piece.fields.map((k) => (
                <div key={k} className="border-b border-line pb-5">
                  <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <ValueInput
                      guide={guides[k]}
                      value={values[k]}
                      unit={unit}
                      size="sm"
                      showProblem={showProblems}
                      onChange={(v) => onChange(k, v)}
                      onFocus={() => setQuickFocus(k)}
                    />
                    <button
                      type="button"
                      onClick={() => go({ stage: "measure", index: plan.fields.indexOf(k) })}
                      className="mb-0.5 min-h-11 border border-line px-3 text-xs text-clay hover:border-ink hover:text-ink"
                    >
                      How?
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-ink/55">{guides[k].what}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => go(pieceIndex === 0 ? { stage: "intro", index: 0 } : { stage: "quick", index: pieceIndex - 1 })}
                className="min-h-12 border border-line px-6 py-3 text-sm hover:border-ink"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pieceBlocking.length) {
                    setShowProblems(true);
                    document.getElementById(`m-${pieceBlocking[0]}`)?.focus();
                    return;
                  }
                  go(last ? { stage: "review", index: 0 } : { stage: "quick", index: pieceIndex + 1 });
                }}
                className="min-h-12 bg-ink px-7 py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta"
              >
                {last ? "Review measurements" : `Next: ${plan.pieces[pieceIndex + 1].title}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────── Guided: one measurement at a time ─────────── */
  const key = plan.fields[fieldIndex];
  const guide = guides[key];
  const piece = plan.pieces[pieceOfField[key]];
  const posInPiece = piece.fields.indexOf(key);
  const problem = fieldProblem(guide, values[key], unit);
  const last = fieldIndex === plan.fields.length - 1;
  const next = () => {
    if (problem === "missing" || problem === "invalid") {
      setShowProblems(true);
      document.getElementById(`m-${key}`)?.focus();
      return;
    }
    go(last ? { stage: "review", index: 0 } : { stage: "measure", index: fieldIndex + 1 });
  };

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {pieceStepper(pieceOfField[key])}
        <UnitToggle unit={unit} onChange={onUnitChange} />
      </div>
      {progress()}

      <div className="mt-6 grid gap-x-10 gap-y-5 [grid-template-areas:'title'_'figure'_'input'_'guide'] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:[grid-template-areas:'figure_title'_'figure_input'_'figure_guide'] lg:grid-rows-[auto_auto_1fr]">
        <div className="[grid-area:title]">
          <p className="label text-clay">
            {piece.title} · {posInPiece + 1} of {piece.fields.length}
          </p>
          <h3 className="display mt-2 text-[2.1rem] leading-none" aria-live="polite">
            {guide.label}
          </h3>
        </div>

        <div className="mx-auto w-full max-w-[22rem] [grid-area:figure] lg:max-w-none">
          <div className="lg:sticky lg:top-24">
            <MeasurementMannequin placement={guide.placement} label={guide.label} zoomOnSmallScreens />
          </div>
        </div>

        <div className="[grid-area:input]" key={key}>
          <ValueInput guide={guide} value={values[key]} unit={unit} onChange={(v) => onChange(key, v)} onEnter={next} showProblem={showProblems} autoFocus={position.index > 0 || done > 0} />
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => go(fieldIndex === 0 ? { stage: "intro", index: 0 } : { stage: "measure", index: fieldIndex - 1 })}
              className="min-h-12 border border-line px-6 py-3 text-sm hover:border-ink"
            >
              Back
            </button>
            <button type="button" onClick={next} className="min-h-12 bg-ink px-7 py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta">
              {last ? "Review measurements" : "Next measurement"}
            </button>
            {!guide.required && !(Number(values[key]) > 0) && (
              <button type="button" onClick={() => go(last ? { stage: "review", index: 0 } : { stage: "measure", index: fieldIndex + 1 })} className="min-h-12 px-2 text-sm text-ink/60 underline underline-offset-4 hover:text-ink">
                Skip, let the tailor decide
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-line pt-5 [grid-area:guide]">
          <p className="label mb-3 text-ink/55">How to measure</p>
          <MeasurementInstructions guide={guide} />
          {done === plan.fields.length && !last && (
            <button type="button" onClick={() => go({ stage: "review", index: 0 })} className="link-line mt-6 text-sm text-clay">
              All entered, go to review →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
