"use client";

import { useState } from "react";
import { MeasurementField, MeasurementUnit, MeasurementValues } from "@/lib/types";
import { useAdminStore } from "@/lib/admin/store";
import MeasurementSilhouette from "./MeasurementSilhouette";
import { UnitToggle } from "./ManualMeasurementForm";

export default function GuidedMeasurementFlow({
  fields,
  values,
  unit,
  onChange,
  onUnitChange,
  onComplete,
}: {
  fields: MeasurementField[];
  values: MeasurementValues;
  unit: MeasurementUnit;
  onChange: (field: MeasurementField, value: number | undefined) => void;
  onUnitChange: (unit: MeasurementUnit) => void;
  onComplete: () => void;
}) {
  const { measurementFieldDefs } = useAdminStore();
  const [step, setStep] = useState(0);
  const field = fields[step];
  const meta = measurementFieldDefs.find((d) => d.key === field) ?? { label: field, instructions: "", commonMistakes: undefined, illustration: undefined, videoUrl: undefined, minCm: undefined, maxCm: undefined, required: false };
  const isLast = step === fields.length - 1;
  const value = values[field];
  const valueCm = value !== undefined ? (unit === "in" ? value * 2.54 : value) : undefined;
  const outOfRange = valueCm !== undefined && meta.minCm !== undefined && meta.maxCm !== undefined && (valueCm < meta.minCm || valueCm > meta.maxCm);

  return (
    <div className="grid gap-8 sm:grid-cols-[180px_1fr]">
      <div className="mx-auto flex h-44 w-32 items-center justify-center border border-line bg-ivory-deep/40 sm:h-full sm:w-full">
        <MeasurementSilhouette active={field} className="h-full w-auto p-4 text-clay/70" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">
            Step {step + 1} of {fields.length}
          </p>
          <UnitToggle unit={unit} onChange={onUnitChange} />
        </div>
        <div className="mb-4 h-1 w-full bg-line">
          <div
            className="h-1 bg-brass transition-all duration-300"
            style={{ width: `${((step + 1) / fields.length) * 100}%` }}
          />
        </div>

        <h3 className="font-display text-2xl">
          {meta.label}
          {meta.required && <span className="text-error"> *</span>}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{meta.instructions}</p>
        {meta.commonMistakes && (
          <p className="mt-2 text-xs text-clay">
            <span className="font-medium">Common mistake:</span> {meta.commonMistakes}
          </p>
        )}
        {meta.videoUrl && (
          <a href={meta.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-brass underline underline-offset-2 hover:text-clay">
            Watch how to measure this
          </a>
        )}

        <div className={`mt-5 flex items-center border px-3 focus-within:border-brass sm:w-56 ${outOfRange ? "border-error/60" : "border-line"}`}>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            autoFocus
            value={value ?? ""}
            onChange={(e) => onChange(field, e.target.value === "" ? undefined : Number(e.target.value))}
            className="w-full bg-transparent py-3 text-lg outline-none"
            placeholder="0.0"
          />
          <span className="text-sm text-ink/40">{unit}</span>
        </div>
        {outOfRange && <p className="mt-2 max-w-sm text-xs text-error">This measurement looks unusual — please check your tape placement, or continue if you&rsquo;re confident it&rsquo;s correct.</p>}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="eyebrow border border-line px-5 py-2.5 text-ink/70 hover:border-ink"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
            className="eyebrow bg-ink px-5 py-2.5 text-ivory hover:bg-brass"
          >
            {isLast ? "Finish" : "Next Measurement"}
          </button>
        </div>
      </div>
    </div>
  );
}
