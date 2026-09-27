"use client";

import { MeasurementField, MeasurementUnit, MeasurementValues } from "@/lib/types";
import { useAdminStore } from "@/lib/admin/store";

function toCm(value: number, unit: MeasurementUnit) {
  return unit === "in" ? value * 2.54 : value;
}

export default function ManualMeasurementForm({
  fields,
  values,
  unit,
  onChange,
  onUnitChange,
}: {
  fields: MeasurementField[];
  values: MeasurementValues;
  unit: MeasurementUnit;
  onChange: (field: MeasurementField, value: number | undefined) => void;
  onUnitChange: (unit: MeasurementUnit) => void;
}) {
  const { measurementFieldDefs } = useAdminStore();
  const defs = fields.map((f) => measurementFieldDefs.find((d) => d.key === f)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const requiredCount = defs.filter((d) => d.required).length;
  const requiredFilled = defs.filter((d) => d.required && values[d.key] !== undefined).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">Enter Your Measurements</p>
        <UnitToggle unit={unit} onChange={onUnitChange} />
      </div>
      {requiredCount > 0 && (
        <div className="mb-4">
          <div className="h-1 w-full bg-line">
            <div className="h-1 bg-brass transition-all duration-300" style={{ width: `${(requiredFilled / requiredCount) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-ink/45">
            {requiredFilled} of {requiredCount} required measurements complete
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {fields.map((f) => {
          const def = measurementFieldDefs.find((d) => d.key === f);
          const value = values[f];
          const outOfRange =
            value !== undefined && def?.minCm !== undefined && def?.maxCm !== undefined
              ? toCm(value, unit) < def.minCm || toCm(value, unit) > def.maxCm
              : false;
          return (
            <label key={f} className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/70">
                {def?.label ?? f}
                {def?.required && <span className="text-error"> *</span>}
                {def?.videoUrl && (
                  <a href={def.videoUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-brass underline underline-offset-2 hover:text-clay">
                    watch
                  </a>
                )}
              </span>
              <div className={`flex items-center border focus-within:border-brass ${outOfRange ? "border-error/60" : "border-line"}`}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={value ?? ""}
                  onChange={(e) => onChange(f, e.target.value === "" ? undefined : Number(e.target.value))}
                  className="w-full bg-transparent px-2.5 py-2 text-sm outline-none"
                  placeholder="—"
                />
                <span className="pr-2.5 text-xs text-ink/40">{unit}</span>
              </div>
              {outOfRange && <span className="text-[11px] text-error">This measurement looks unusual — please double-check your tape placement.</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function UnitToggle({ unit, onChange }: { unit: MeasurementUnit; onChange: (u: MeasurementUnit) => void }) {
  return (
    <div className="flex border border-line text-xs">
      {(["cm", "in"] as MeasurementUnit[]).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`px-2.5 py-1.5 ${unit === u ? "bg-ink text-ivory" : "text-ink/60 hover:text-ink"}`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
