"use client";

// The measuring guide, open to everyone: pick a style and see every
// measurement it needs, piece by piece, on the mannequin. Signed-in customers
// can also keep saved measurement profiles here for faster bespoke orders.

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MeasurementUnit, MeasurementValues, Product } from "@/lib/types";
import { useAdminStore } from "@/lib/admin/store";
import { useMeasurements } from "@/lib/measurement-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { convertValues, fieldGuide, fullMeasurementPlan, resolveMeasurementPlan, type MeasurementPlan } from "@/lib/measurement-guide";
import { sizingModeOf } from "@/lib/product-utils";
import MeasurementMannequin from "@/components/measurement/MeasurementMannequin";
import MeasurementInstructions from "@/components/measurement/MeasurementInstructions";
import GuidedMeasurementFlow, { type FlowPosition } from "@/components/measurement/GuidedMeasurementFlow";
import { Button } from "@/components/ui/Button";
import PhotoStrip from "@/components/campaign/PhotoStrip";
import { shots } from "@/lib/campaign-shots";

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <MeasurementsContent />
    </Suspense>
  );
}

function MeasurementsContent() {
  const { products, categories, measurementFieldDefs: defs, isReady } = useAdminStore();
  const params = useSearchParams();
  const router = useRouter();

  // One guide per bespoke style the house actually offers.
  const styles = useMemo(() => {
    const seen = new Map<string, { slug: string; name: string; plan: MeasurementPlan }>();
    for (const p of products) {
      if (p.publishStatus !== "published" || !["made-to-measure", "both"].includes(sizingModeOf(p))) continue;
      const category = categories.find((c) => c.slug === p.category);
      const slug = category?.slug ?? p.category;
      if (seen.has(slug)) continue;
      const plan = resolveMeasurementPlan(p as Product, categories, defs);
      if (plan.fields.length) seen.set(slug, { slug, name: plan.styleName === "Outfit" ? category?.name ?? slug : plan.styleName, plan });
    }
    return [...seen.values()];
  }, [products, categories, defs]);

  const styleSlug = params.get("style") ?? styles[0]?.slug;
  const style = styles.find((s) => s.slug === styleSlug) ?? styles[0];
  const [activeKey, setActiveKey] = useState<string | undefined>();
  const active = style && (activeKey && style.plan.fields.includes(activeKey) ? activeKey : style.plan.fields[0]);
  const guide = active ? fieldGuide(active, defs, style.plan) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <p className="label text-clay">Measuring guide</p>
      <h1 className="display mt-3 text-[clamp(2.3rem,5vw,3.6rem)]">How to measure yourself</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/70">
        Each style needs its own set of measurements. An agbada, for example, needs the robe, the inner top and the trousers. Choose a
        style to see exactly what to measure and where the tape goes. When you order, we&rsquo;ll walk you through the same steps one by one.
      </p>

      {!isReady ? (
        <div className="mt-10 h-96 animate-pulse bg-bone/50" aria-hidden />
      ) : !style ? (
        <p className="mt-10 text-sm text-ink/60">The measuring guide will appear here once bespoke styles are available.</p>
      ) : (
        <>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Choose a style">
            {styles.map((s) => (
              <button
                key={s.slug}
                type="button"
                role="tab"
                aria-selected={s.slug === style.slug}
                onClick={() => {
                  setActiveKey(undefined);
                  router.replace(`/measurements?style=${encodeURIComponent(s.slug)}`, { scroll: false });
                }}
                className={`min-h-11 shrink-0 border px-4 text-sm transition-colors ${s.slug === style.slug ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="mx-auto w-full max-w-[20rem] lg:max-w-none">
              <div className="lg:sticky lg:top-24">
                <MeasurementMannequin placement={guide?.placement} label={guide?.label} zoomOnSmallScreens />
              </div>
            </div>
            <div>
              {style.plan.pieces.map((piece) => (
                <section key={piece.id} className="mb-6" aria-labelledby={`piece-${piece.id}`}>
                  <h2 id={`piece-${piece.id}`} className="flex items-baseline justify-between border-b border-ink/80 pb-2">
                    <span className="display text-2xl">{piece.title}</span>
                    <span className="text-xs text-ink/55">{piece.fields.length} measurements</span>
                  </h2>
                  <ul>
                    {piece.fields.map((k) => {
                      const g = fieldGuide(k, defs, style.plan);
                      const open = k === active;
                      return (
                        <li key={k} className="border-b border-line">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setActiveKey(k)}
                            className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left"
                          >
                            <span className={open ? "font-medium" : ""}>{g.label}</span>
                            <span className="text-xs text-ink/45">{open ? "Shown on the mannequin" : "Show me"}</span>
                          </button>
                          {open && (
                            <div className="pb-5">
                              <MeasurementInstructions guide={g} compact />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <Button href="/made-to-measure" className="mt-2">
                Start a bespoke order
              </Button>
            </div>
          </div>
        </>
      )}

      <SavedProfiles />
      <PhotoStrip title="Cut to your measurements" linkHref="/made-to-measure" linkLabel="Browse Bespoke styles" shots={shots(
        "blue-geometric-set-full-length", "burgundy-robe-front", "ivory-textured-set-front", "ivory-woven-panel-shirt-side",
        "blue-geometric-set-seated-wide", "burgundy-robe-back", "ivory-textured-polo-back", "burgundy-striped-cap-front",
      )} className="-mx-4 mt-16 pb-0 sm:-mx-6 lg:-mx-8 lg:pb-0" />
    </div>
  );
}

function SavedProfiles() {
  const { currentUser } = useCustomerAuth();
  const { profiles, createProfile, updateProfile, deleteProfile } = useMeasurements();
  const { measurementFieldDefs: defs } = useAdminStore();
  const plan = useMemo(() => fullMeasurementPlan(defs), [defs]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <section className="mt-20 border-t border-line pt-12" aria-labelledby="profiles-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-clay">Saved measurements</p>
          <h2 id="profiles-heading" className="display mt-2 text-3xl">
            Your measurement profiles
          </h2>
          <p className="mt-2 max-w-lg text-sm text-ink/65">Save your measurements once and reuse them on every bespoke order.</p>
        </div>
        {currentUser && editing === null && <Button onClick={() => setEditing("new")}>New profile</Button>}
      </div>

      {!currentUser ? (
        <p className="mt-6 text-sm text-ink/70">
          <Link href="/login?next=/measurements" className="link-line text-clay">
            Sign in
          </Link>{" "}
          to save and reuse your measurements. You can still measure as a guest when you place a bespoke order.
        </p>
      ) : (
        <>
          {editing === "new" && (
            <ProfileEditor
              plan={plan}
              initialLabel={`My measurements ${profiles.length + 1}`}
              initialUnit="cm"
              initialValues={{}}
              onCancel={() => setEditing(null)}
              onSubmit={async (label, unit, values) => {
                if (await createProfile(label, unit, values)) setEditing(null);
              }}
            />
          )}
          {profiles.length === 0 && editing !== "new" && (
            <div className="mt-6 border border-dashed border-line px-6 py-12 text-center">
              <p className="display text-xl">No saved measurements yet</p>
              <p className="mt-2 text-sm text-ink/60">They&rsquo;re saved automatically when you measure during a bespoke order, or create one now.</p>
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {profiles.map((p) =>
              editing === p.id ? (
                <div key={p.id} className="sm:col-span-2">
                  <ProfileEditor
                    plan={plan}
                    initialLabel={p.label}
                    initialUnit={p.unit}
                    initialValues={p.values}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (label, unit, values) => {
                      await updateProfile(p.id, { label, unit, values });
                      setEditing(null);
                    }}
                  />
                </div>
              ) : (
                <div key={p.id} className="border border-line p-5">
                  <p className="display text-xl">{p.label}</p>
                  <p className="mt-1 text-xs text-ink/50">Updated {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                    {Object.entries(p.values)
                      .filter(([, v]) => Number(v) > 0)
                      .slice(0, 9)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-ink/50">{fieldGuide(k, defs).label}</dt>
                          <dd className="tabular-nums">
                            {v} {p.unit}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  <div className="mt-5 flex gap-5 text-xs">
                    <button type="button" onClick={() => setEditing(p.id)} className="min-h-10 text-clay underline underline-offset-4 hover:text-ink">
                      Edit
                    </button>
                    {confirmDelete === p.id ? (
                      <span className="flex items-center gap-3">
                        <span className="text-ink/60">Delete this profile?</span>
                        <button type="button" onClick={() => void deleteProfile(p.id).then(() => setConfirmDelete(null))} className="min-h-10 text-error underline underline-offset-4">
                          Yes, delete
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="min-h-10 underline underline-offset-4">
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(p.id)} className="min-h-10 text-ink/50 hover:text-error">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ProfileEditor({
  plan,
  initialLabel,
  initialUnit,
  initialValues,
  onCancel,
  onSubmit,
}: {
  plan: MeasurementPlan;
  initialLabel: string;
  initialUnit: MeasurementUnit;
  initialValues: MeasurementValues;
  onCancel: () => void;
  onSubmit: (label: string, unit: MeasurementUnit, values: MeasurementValues) => Promise<void>;
}) {
  const { measurementFieldDefs: defs } = useAdminStore();
  const [label, setLabel] = useState(initialLabel);
  const [unit, setUnit] = useState<MeasurementUnit>(initialUnit);
  const [values, setValues] = useState<MeasurementValues>(initialValues);
  const [position, setPosition] = useState<FlowPosition>({ stage: Object.keys(initialValues).length ? "quick" : "intro", index: 0 });
  const [busy, setBusy] = useState(false);
  // A general profile covers every style, so nothing is strictly required.
  const optionalDefs = useMemo(() => defs.map((d) => ({ ...d, required: false })), [defs]);

  return (
    <div className="mt-6 border border-ink/30 bg-bone/30 p-4 sm:p-6">
      <label className="mb-6 flex max-w-sm flex-col gap-1.5">
        <span className="label text-ink/60">Profile name</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-ink" />
      </label>
      <GuidedMeasurementFlow
        plan={plan}
        defs={optionalDefs}
        values={values}
        unit={unit}
        position={position}
        onPositionChange={setPosition}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onUnitChange={(u) => {
          setValues((prev) => convertValues(prev, unit, u));
          setUnit(u);
        }}
        busy={busy}
        finishLabel="Save profile"
        onFinish={async () => {
          setBusy(true);
          try {
            const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => Number(v) > 0)) as MeasurementValues;
            await onSubmit(label.trim() || "My measurements", unit, clean);
          } finally {
            setBusy(false);
          }
        }}
      />
      <button type="button" onClick={onCancel} className="mt-6 min-h-10 text-sm text-ink/60 underline underline-offset-4 hover:text-ink">
        Cancel
      </button>
    </div>
  );
}
