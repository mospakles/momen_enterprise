"use client";

import { useState } from "react";
import { MeasurementUnit, MeasurementValues } from "@/lib/types";
import { useAdminStore } from "@/lib/admin/store";
import { useMeasurements } from "@/lib/measurement-context";
import ManualMeasurementForm from "@/components/measurement/ManualMeasurementForm";
import MeasurementSilhouette from "@/components/measurement/MeasurementSilhouette";
import { Button } from "@/components/ui/Button";

export default function MeasurementsPage() {
  const { profiles, createProfile, updateProfile, deleteProfile } = useMeasurements();
  const { measurementFieldDefs } = useAdminStore();
  const allFields = [...measurementFieldDefs].sort((a, b) => a.sortOrder - b.sortOrder).map((d) => d.key);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">My Measurements</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Measurement Profiles</h1>
          <p className="mt-2 max-w-lg text-sm text-ink/70">
            Save one or more profiles so you never re-enter your measurements at checkout.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New Profile</Button>
      </div>

      {profiles.length === 0 && !creating && (
        <div className="border border-dashed border-line py-20 text-center">
          <p className="font-display text-xl">No measurement profiles yet</p>
          <p className="mt-2 text-sm text-ink/60">Create one to speed up made-to-measure checkout.</p>
          <Button onClick={() => setCreating(true)} className="mt-6">
            Create Your First Profile
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {profiles.map((p) =>
          editingId === p.id ? (
            <div key={p.id} className="sm:col-span-2">
              <ProfileEditor
                fields={allFields}
                initialLabel={p.label}
                initialUnit={p.unit}
                initialValues={p.values}
                onCancel={() => setEditingId(null)}
                onSubmit={(label, unit, values) => {
                  updateProfile(p.id, { label, unit, values });
                  setEditingId(null);
                }}
              />
            </div>
          ) : (
            <div key={p.id} className="border border-line p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg">{p.label}</p>
                  <p className="mt-1 text-xs text-ink/50">Updated {new Date(p.updatedAt).toLocaleDateString()}</p>
                </div>
                <MeasurementSilhouette className="h-16 w-10 text-clay/50" />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-y-2 text-xs text-ink/70">
                {Object.entries(p.values)
                  .slice(0, 6)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-ink/40">{measurementFieldDefs.find((d) => d.key === k)?.label ?? k}</dt>
                      <dd>{v}{p.unit}</dd>
                    </div>
                  ))}
              </dl>
              <div className="mt-5 flex gap-4 text-xs">
                <button onClick={() => setEditingId(p.id)} className="eyebrow text-clay hover:text-brass">
                  Update Measurements
                </button>
                <button onClick={() => deleteProfile(p.id)} className="eyebrow text-ink/40 hover:text-error">
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {creating && (
        <div className="mt-8">
          <ProfileEditor
            fields={allFields}
            initialLabel={`Measurements ${profiles.length + 1}`}
            initialUnit="cm"
            initialValues={{}}
            onCancel={() => setCreating(false)}
            onSubmit={(label, unit, values) => {
              createProfile(label, unit, values);
              setCreating(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ProfileEditor({
  fields,
  initialLabel,
  initialUnit,
  initialValues,
  onCancel,
  onSubmit,
}: {
  fields: import("@/lib/types").MeasurementField[];
  initialLabel: string;
  initialUnit: MeasurementUnit;
  initialValues: MeasurementValues;
  onCancel: () => void;
  onSubmit: (label: string, unit: MeasurementUnit, values: MeasurementValues) => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [unit, setUnit] = useState<MeasurementUnit>(initialUnit);
  const [values, setValues] = useState<MeasurementValues>(initialValues);

  return (
    <div className="border border-brass/60 bg-ivory-deep/30 p-6">
      <label className="mb-4 flex flex-col gap-1.5">
        <span className="eyebrow">Profile Name</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='e.g. "Occasion Wear Measurements"'
          className="border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>
      <ManualMeasurementForm
        fields={fields}
        values={values}
        unit={unit}
        onChange={(field, v) => setValues((prev) => ({ ...prev, [field]: v }))}
        onUnitChange={setUnit}
      />
      <div className="mt-5 flex gap-3">
        <Button onClick={() => onSubmit(label || "Untitled Profile", unit, values)}>Save Profile</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
