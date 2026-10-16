"use client";

import { useEffect, useMemo, useState } from "react";
import { Garment, MeasurementField, MeasurementUnit, MeasurementValues } from "@/lib/types";
import { useAdminStore } from "@/lib/admin/store";
import { useMeasurements } from "@/lib/measurement-context";
import ManualMeasurementForm from "./ManualMeasurementForm";
import GuidedMeasurementFlow from "./GuidedMeasurementFlow";

type Mode = "choose" | "profile" | "manual" | "guided";

export default function MeasurementCapture({
  garment,
  storageKey,
  onSaved,
  fieldOverride,
}: {
  garment: Garment;
  storageKey: string;
  onSaved: (payload: { mode: "profile" | "manual"; profileId?: string; values?: MeasurementValues; unit: MeasurementUnit }) => void;
  /** Per-product measurement field override configured in the admin Products
   * editor — falls back to the garment's admin-configured default fields. */
  fieldOverride?: MeasurementField[];
}) {
  const { profiles, createProfile } = useMeasurements();
  const { measurementFieldDefs } = useAdminStore();
  const fields = useMemo(
    () =>
      // An empty override (the API default) means "use the garment's fields".
      (fieldOverride?.length ? fieldOverride : undefined) ??
      measurementFieldDefs
        .filter((d) => d.garments.includes(garment))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((d) => d.key),
    [fieldOverride, measurementFieldDefs, garment]
  );
  const [mode, setMode] = useState<Mode>("choose");
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
  const [values, setValues] = useState<MeasurementValues>({});
  const [profileId, setProfileId] = useState<string | undefined>(profiles[0]?.id);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating draft from localStorage on mount
        setValues(draft.values ?? {});
        setUnit(draft.unit ?? "cm");
        if (draft.mode) setMode(draft.mode);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ values, unit, mode }));
  }, [values, unit, mode, storageKey]);

  function handleChange(field: MeasurementField, value: number | undefined) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  // Every field marked required in the admin (all of them, if none are flagged)
  // needs a positive value before the measurements can be saved.
  const requiredFields = useMemo(() => {
    const flagged = fields.filter((f) => measurementFieldDefs.find((d) => d.key === f)?.required);
    return flagged.length ? flagged : fields;
  }, [fields, measurementFieldDefs]);
  const missing = requiredFields.filter((f) => !(Number(values[f]) > 0));
  const labelOf = (f: MeasurementField) => measurementFieldDefs.find((d) => d.key === f)?.label ?? f;

  function finalizeManual() {
    if (missing.length || fields.length === 0) {
      // From the guided flow, land on the form so the gaps are visible.
      setMode("manual");
      return;
    }
    if (saveToAccount) {
      createProfile(`Measurements — ${new Date().toLocaleDateString()}`, unit, values);
    }
    setSavedLabel("Measurements captured for this order.");
    onSaved({ mode: "manual", values, unit });
  }

  if (mode === "choose") {
    return (
      <div className="border border-line p-5">
        <p className="eyebrow mb-1">How would you like to provide your measurements?</p>
        <p className="mb-4 text-xs text-ink/50">This piece is made-to-measure — we&apos;ll cut it to your exact form.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.length > 0 && (
            <button
              onClick={() => setMode("profile")}
              className="border border-line p-4 text-left hover:border-brass"
            >
              <p className="text-sm font-medium">Use a saved profile</p>
              <p className="mt-1 text-xs text-ink/60">Choose from your {profiles.length} saved measurement profile(s).</p>
            </button>
          )}
          <button onClick={() => setMode("manual")} className="border border-line p-4 text-left hover:border-brass">
            <p className="text-sm font-medium">I already have my measurements</p>
            <p className="mt-1 text-xs text-ink/60">Enter measurements directly into a form.</p>
          </button>
          <button onClick={() => setMode("guided")} className="border border-line p-4 text-left hover:border-brass sm:col-span-2">
            <p className="text-sm font-medium">Help me take my measurements</p>
            <p className="mt-1 text-xs text-ink/60">A guided, illustrated, step-by-step process.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-line p-5">
      <button onClick={() => setMode("choose")} className="eyebrow mb-4 text-clay hover:text-brass">
        ← Change method
      </button>

      {mode === "profile" && (
        <div>
          <p className="eyebrow mb-3">Select a Measurement Profile</p>
          <div className="space-y-2">
            {profiles.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center justify-between border px-4 py-3 text-sm ${
                  profileId === p.id ? "border-brass bg-ivory-deep/40" : "border-line"
                }`}
              >
                <span>
                  <input
                    type="radio"
                    name="profile"
                    className="mr-3 accent-brass"
                    checked={profileId === p.id}
                    onChange={() => setProfileId(p.id)}
                  />
                  {p.label}
                </span>
                <span className="text-xs text-ink/50">Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              setSavedLabel("Profile linked to this order.");
              onSaved({ mode: "profile", profileId, unit });
            }}
            disabled={!profileId}
            className="eyebrow mt-4 bg-ink px-5 py-2.5 text-ivory hover:bg-brass disabled:opacity-40"
          >
            Use This Profile
          </button>
        </div>
      )}

      {mode === "manual" && (
        <div>
          <ManualMeasurementForm fields={fields} values={values} unit={unit} onChange={handleChange} onUnitChange={setUnit} />
          <label className="mt-4 flex items-center gap-2 text-xs text-ink/60">
            <input type="checkbox" checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)} className="accent-brass" />
            Save these measurements to my account for future orders
          </label>
          <button onClick={finalizeManual} disabled={missing.length > 0 || fields.length === 0} className="eyebrow mt-4 bg-ink px-5 py-2.5 text-ivory hover:bg-brass disabled:opacity-40">
            Save Measurements
          </button>
          {fields.length === 0 ? (
            <p className="mt-2 text-xs text-error">We couldn&apos;t load the measurement form — refresh the page, or contact us and we&apos;ll take them with you.</p>
          ) : (
            missing.length > 0 && <p className="mt-2 text-xs text-ink/55">Still needed: {missing.map(labelOf).join(", ")}.</p>
          )}
        </div>
      )}

      {mode === "guided" && (
        <GuidedMeasurementFlow
          fields={fields}
          values={values}
          unit={unit}
          onChange={handleChange}
          onUnitChange={setUnit}
          onComplete={finalizeManual}
        />
      )}

      {savedLabel && <p className="mt-4 text-xs text-brass">✓ {savedLabel}</p>}
    </div>
  );
}
