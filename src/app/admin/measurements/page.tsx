"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { useMeasurements } from "@/lib/measurement-context";
import { formatDate } from "@/lib/format";
import type { Garment, MeasurementFieldDef, MeasurementUnit } from "@/lib/types";
import { PageHeader, Card, Tabs, Modal, Drawer, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, TextareaField, SelectField, Toggle, NumberField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

const GARMENTS: Garment[] = ["top", "trouser", "set", "agbada", "accessory"];

export default function AdminMeasurementsPage() {
  const [tab, setTab] = useState("fields");

  return (
    <div>
      <PageHeader title="Measurements" description="Configure made-to-measure fields and review saved customer profiles." />
      <Tabs tabs={[{ key: "fields", label: "Field Configuration" }, { key: "profiles", label: "Customer Profiles" }]} active={tab} onChange={setTab} />
      <div className="mt-5">{tab === "fields" ? <FieldConfig /> : <ProfilesView />}</div>
    </div>
  );
}

function FieldConfig() {
  const { measurementFieldDefs, setMeasurementFieldDefs } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<MeasurementFieldDef | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = [...measurementFieldDefs].sort((a, b) => a.sortOrder - b.sortOrder);

  function save(f: MeasurementFieldDef) {
    const isNew = !measurementFieldDefs.some((x) => x.key === f.key);
    setMeasurementFieldDefs((prev) => (isNew ? [...prev, f] : prev.map((x) => (x.key === f.key ? f : x))));
    audit(isNew ? "measurement_field.created" : "measurement_field.updated", "measurements", `${isNew ? "Created" : "Updated"} measurement field "${f.label}".`, {});
    setEditing(null);
    setCreating(false);
  }

  function remove(key: string) {
    setMeasurementFieldDefs((prev) => prev.filter((f) => f.key !== key));
    audit("measurement_field.deleted", "measurements", `Deleted measurement field "${key}".`, {});
  }

  const columns: Column<MeasurementFieldDef>[] = [
    { key: "label", label: "Field", render: (f) => <div><p className="font-medium">{f.label}</p><p className="text-xs text-ink/40">{f.key}</p></div>, sortValue: (f) => f.label, csvValue: (f) => f.label },
    { key: "unit", label: "Unit", render: (f) => f.unit, sortValue: (f) => f.unit, csvValue: (f) => f.unit },
    { key: "required", label: "Required", render: (f) => (f.required ? "Yes" : "Optional"), sortValue: (f) => (f.required ? 1 : 0), csvValue: (f) => (f.required ? "Yes" : "Optional") },
    { key: "garments", label: "Applies To", render: (f) => f.garments.join(", "), csvValue: (f) => f.garments.join(", ") },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {can("measurements", "create") && <Button size="sm" onClick={() => setCreating(true)}>New Field</Button>}
      </div>
      <DataTable columns={columns} rows={sorted} getRowId={(f) => f.key} emptyTitle="No measurement fields configured" pageSize={20} onRowClick={(f) => setEditing(f)} />

      {(editing || creating) && (
        <FieldModal
          field={editing}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={save}
          onDelete={editing ? () => setConfirmDelete(editing.key) : undefined}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) remove(confirmDelete); setEditing(null); }}
        title="Delete this measurement field?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function FieldModal({ field, onCancel, onSave, onDelete }: { field: MeasurementFieldDef | null; onCancel: () => void; onSave: (f: MeasurementFieldDef) => void; onDelete?: () => void }) {
  const [form, setForm] = useState<MeasurementFieldDef>(
    field ?? { key: "", label: "", description: "", instructions: "", illustration: "", videoUrl: "", unit: "cm", required: false, garments: [], sortOrder: 99 }
  );

  function set<K extends keyof MeasurementFieldDef>(key: K, value: MeasurementFieldDef[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleGarment(g: Garment) {
    set("garments", form.garments.includes(g) ? form.garments.filter((x) => x !== g) : [...form.garments, g]);
  }

  return (
    <Modal open onClose={onCancel} title={field ? `Edit — ${field.label}` : "New Measurement Field"} size="lg">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label" required value={form.label} onChange={(v) => set("label", v)} />
          <Field label="Key" required value={form.key} onChange={(v) => set("key", v)} disabled={Boolean(field)} hint="Used internally — cannot change once created." />
        </div>
        <TextareaField label="Description" value={form.description ?? ""} onChange={(v) => set("description", v)} rows={2} />
        <TextareaField label="Measurement Instructions" value={form.instructions ?? ""} onChange={(v) => set("instructions", v)} rows={3} />
        <Field label="Illustration URL" value={form.illustration ?? ""} onChange={(v) => set("illustration", v)} />
        <Field label="Instructional Video URL" value={form.videoUrl ?? ""} onChange={(v) => set("videoUrl", v)} hint="Shown to customers as a short watch-how-to-measure link during guided and manual measurement capture." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<MeasurementUnit> label="Unit" value={form.unit} onChange={(v) => set("unit", v)} options={[{ value: "cm", label: "Centimetres" }, { value: "in", label: "Inches" }]} />
          <NumberField label="Sort Order" value={form.sortOrder} onChange={(v) => set("sortOrder", v)} />
        </div>
        <Toggle label="Required" checked={form.required} onChange={(v) => set("required", v)} />
        <div>
          <p className="mb-1.5 text-xs text-ink/60">Applies to garment types</p>
          <div className="flex flex-wrap gap-3">
            {GARMENTS.map((g) => (
              <label key={g} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={form.garments.includes(g)} onChange={() => toggleGarment(g)} className="accent-brass" />
                {g}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form)} disabled={!form.key || !form.label}>Save Field</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-ink/40 hover:text-error">Delete</button>}
      </div>
    </Modal>
  );
}

function ProfilesView() {
  const { profiles, updateProfile, deleteProfile } = useMeasurements();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = profiles.find((p) => p.id === openId);

  const columns: Column<(typeof profiles)[number]>[] = [
    { key: "label", label: "Profile", render: (p) => p.label, sortValue: (p) => p.label, csvValue: (p) => p.label },
    { key: "unit", label: "Unit", render: (p) => p.unit, csvValue: (p) => p.unit },
    { key: "fields", label: "Fields Recorded", align: "right", render: (p) => Object.keys(p.values).length, csvValue: (p) => Object.keys(p.values).length },
    { key: "updated", label: "Last Updated", render: (p) => formatDate(p.updatedAt), sortValue: (p) => p.updatedAt, csvValue: (p) => formatDate(p.updatedAt) },
  ];

  if (profiles.length === 0) return <EmptyState title="No measurement profiles saved yet" description="Profiles appear here once a customer saves measurements on this device." />;

  return (
    <>
      <DataTable columns={columns} rows={profiles} getRowId={(p) => p.id} pageSize={12} onRowClick={(p) => setOpenId(p.id)} />
      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.label}>
          <p className="mb-4 text-xs text-ink/45">Created {open.createdAt ? formatDate(open.createdAt) : "—"} · Updated {formatDate(open.updatedAt)}</p>
          <Card>
            <p className="eyebrow mb-3">Current Values ({open.unit})</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(open.values).map(([k, v]) => (
                <label key={k} className="flex flex-col gap-1">
                  <span className="text-xs text-ink/50">{k}</span>
                  <input
                    type="number"
                    defaultValue={v}
                    disabled={!can("measurements", "edit")}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      if (!Number.isNaN(num) && num !== v) {
                        updateProfile(open.id, { values: { ...open.values, [k]: num } });
                        audit("measurement.updated", "measurements", `Updated ${k} on profile "${open.label}".`, { resourceId: open.id, before: v, after: num });
                      }
                    }}
                    className="border border-line bg-ivory px-2.5 py-2 text-sm outline-none focus:border-brass disabled:opacity-50"
                  />
                </label>
              ))}
            </div>
          </Card>

          {open.history && open.history.length > 0 && (
            <Card className="mt-4">
              <p className="eyebrow mb-3">Change History</p>
              <ul className="space-y-2 text-xs text-ink/55">
                {open.history.map((h, i) => (
                  <li key={i} className="border-b border-line pb-2 last:border-0">
                    {formatDate(h.changedAt)} — {Object.entries(h.values).map(([k, v]) => `${k}: ${v}`).join(", ")}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {can("measurements", "delete") && (
            <button
              onClick={() => {
                deleteProfile(open.id);
                setOpenId(null);
              }}
              className="mt-4 text-xs text-error hover:underline"
            >
              Delete profile
            </button>
          )}
        </Drawer>
      )}
    </>
  );
}
