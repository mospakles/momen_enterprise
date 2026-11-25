"use client";

// Collects measurements for one product: from a saved profile, or through the
// guided flow. Which measurements are asked for comes from the product's
// style (see resolveMeasurementPlan). The draft (values, unit and step) is
// kept in localStorage under `storageKey`, so leaving and coming back never
// loses anything.

import { useEffect, useMemo, useState } from "react";
import type { MeasurementUnit, MeasurementValues, Product } from "@/lib/types";
import { useAdminStore } from "@/lib/admin/store";
import { useMeasurements } from "@/lib/measurement-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { convertValues, fieldGuide, fieldProblem, resolveMeasurementPlan } from "@/lib/measurement-guide";
import GuidedMeasurementFlow, { type FlowPosition } from "./GuidedMeasurementFlow";

export interface MeasurementPayload {
  mode: "profile" | "manual";
  profileId?: string;
  values?: MeasurementValues;
  unit: MeasurementUnit;
}

type Mode = "profile" | "flow";
interface Draft {
  values: MeasurementValues;
  unit: MeasurementUnit;
  position: FlowPosition;
  /** Unset until the customer picks; then profiles are offered first. */
  mode?: Mode;
}

export default function MeasurementCapture({
  product,
  storageKey,
  onSaved,
  finishLabel,
}: {
  product: Product;
  storageKey: string;
  onSaved: (payload: MeasurementPayload) => void;
  finishLabel?: string;
}) {
  const { profiles, createProfile } = useMeasurements();
  const { currentUser } = useCustomerAuth();
  const { categories, measurementFieldDefs: defs } = useAdminStore();
  const plan = useMemo(() => resolveMeasurementPlan(product, categories, defs), [product, categories, defs]);

  const [draft, setDraft] = useState<Draft>({ values: {}, unit: "cm", position: { stage: "intro", index: 0 } });
  const [hydrated, setHydrated] = useState(false);
  const [profileId, setProfileId] = useState<string | undefined>();
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let restored: Partial<Draft> = {};
    try {
      restored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved draft once, after mount
    setDraft((d) => ({
      values: restored.values ?? d.values,
      unit: restored.unit === "in" ? "in" : "cm",
      position: restored.position ?? d.position,
      mode: restored.mode ?? d.mode,
    }));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {}
  }, [draft, hydrated, storageKey]);

  // Offer saved profiles first when the customer has any.
  const mode: Mode = profiles.length > 0 ? draft.mode ?? "profile" : "flow";
  const selected = profiles.find((p) => p.id === profileId) ?? profiles[0];
  const profileGaps = selected
    ? plan.fields.filter((k) => {
        const p = fieldProblem(fieldGuide(k, defs, plan), selected.values[k], selected.unit);
        return p === "missing" || p === "invalid";
      })
    : [];

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  async function finish() {
    const values = Object.fromEntries(plan.fields.filter((k) => Number(draft.values[k]) > 0).map((k) => [k, draft.values[k]])) as MeasurementValues;
    setBusy(true);
    try {
      if (currentUser && saveToAccount) {
        await createProfile(`${plan.styleName} measurements · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, draft.unit, values);
      }
      setSaved("Measurements saved for this piece.");
      onSaved({ mode: "manual", values, unit: draft.unit });
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <div className="min-h-64 animate-pulse bg-bone/50" aria-hidden />;

  if (plan.fields.length === 0) {
    return (
      <div className="border border-line p-5 text-sm">
        <p className="font-medium">We couldn&rsquo;t load the measurement guide.</p>
        <p className="mt-1 text-ink/65">Refresh the page. If it keeps happening, contact us and a tailor will take your measurements with you.</p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-ivory p-4 sm:p-6">
      {profiles.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-line pb-4" role="tablist" aria-label="How to add measurements">
          {(
            [
              ["profile", "Use saved measurements"],
              ["flow", "Measure now"],
            ] as const
          ).map(([m, text]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => update({ mode: m })}
              className={`min-h-10 border px-4 py-2 text-sm transition-colors ${mode === m ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"}`}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {mode === "profile" && selected && (
        <div>
          <p className="label text-clay">Your saved measurements</p>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Saved measurement profiles">
            {profiles.map((p) => (
              <label key={p.id} className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 border px-4 py-3 text-sm ${selected.id === p.id ? "border-ink bg-bone/50" : "border-line"}`}>
                <span className="flex items-center gap-3">
                  <input type="radio" name={`${storageKey}-profile`} className="accent-[var(--color-ink)]" checked={selected.id === p.id} onChange={() => setProfileId(p.id)} />
                  {p.label}
                </span>
                <span className="text-xs text-ink/50">Updated {new Date(p.updatedAt).toLocaleDateString("en-GB")}</span>
              </label>
            ))}
          </div>

          {profileGaps.length > 0 ? (
            <div className="mt-4 border-l-2 border-terracotta bg-bone/60 px-4 py-3 text-sm">
              <p>
                A {plan.styleName.toLowerCase()} needs {profileGaps.length} measurement{profileGaps.length > 1 ? "s" : ""} this profile doesn&rsquo;t have:{" "}
                {profileGaps.map((k) => fieldGuide(k, defs, plan).label).join(", ")}.
              </p>
              <button
                type="button"
                onClick={() => {
                  const known = Object.fromEntries(Object.entries(selected.values).filter(([k]) => plan.fields.includes(k)));
                  update({ mode: "flow", unit: selected.unit, values: { ...convertValues(draft.values, draft.unit, selected.unit), ...known }, position: { stage: "measure", index: plan.fields.indexOf(profileGaps[0]) } });
                }}
                className="mt-3 min-h-11 bg-ink px-5 py-2.5 text-sm text-ivory hover:bg-terracotta"
              >
                Add the missing measurements
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSaved(`Using “${selected.label}”.`);
                onSaved({ mode: "profile", profileId: selected.id, unit: selected.unit });
              }}
              className="mt-5 min-h-12 bg-ink px-7 py-3.5 text-sm tracking-wide text-ivory hover:bg-terracotta"
            >
              Use these measurements
            </button>
          )}
        </div>
      )}

      {mode === "flow" && (
        <GuidedMeasurementFlow
          plan={plan}
          defs={defs}
          values={draft.values}
          unit={draft.unit}
          position={draft.position}
          onPositionChange={(position) => update({ position })}
          onChange={(key, v) => setDraft((d) => ({ ...d, values: { ...d.values, [key]: v } }))}
          onUnitChange={(unit) => setDraft((d) => (d.unit === unit ? d : { ...d, unit, values: convertValues(d.values, d.unit, unit) }))}
          onFinish={() => void finish()}
          finishLabel={finishLabel}
          busy={busy}
          footer={
            currentUser ? (
              <label className="mt-5 flex items-center gap-3 text-sm text-ink/75">
                <input type="checkbox" checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)} className="h-4 w-4 accent-[var(--color-ink)]" />
                Also save to my account for future orders
              </label>
            ) : (
              <p className="mt-5 text-xs text-ink/55">Tip: create an account at checkout and we&rsquo;ll keep these for your next order.</p>
            )
          }
        />
      )}

      {saved && (
        <p role="status" className="mt-5 border-t border-line pt-4 text-sm text-ink">
          <span className="text-brass" aria-hidden>
            ✓{" "}
          </span>
          {saved}
        </p>
      )}
    </div>
  );
}
