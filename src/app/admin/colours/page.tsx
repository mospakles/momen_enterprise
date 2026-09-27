"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { ColorSwatch } from "@/lib/types";
import { PageHeader, Card, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { Field, NumberField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `col-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminColoursPage() {
  const { colorSwatches, upsertColorSwatch, deleteColorSwatch } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<ColorSwatch | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(c: ColorSwatch) {
    const isNew = !colorSwatches.some((x) => x.id === c.id);
    upsertColorSwatch(c);
    audit(isNew ? "colour.created" : "colour.updated", "products", `${isNew ? "Added" : "Updated"} colour "${c.name}".`, { resourceId: c.id });
    setEditing(null);
    setCreating(false);
  }

  const sorted = [...colorSwatches].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title="Colours"
        description="The single, centralized colour library products and the customization wizard draw primary, secondary, and contrast colourways from — a colour is defined here once, never redefined per product."
        actions={can("products", "create") && <Button onClick={() => setCreating(true)}>New Colour</Button>}
      />

      {sorted.length === 0 ? (
        <EmptyState title="No colours yet" />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-ivory p-4">
                <span className="h-8 w-8 shrink-0 rounded-full border border-line" style={{ backgroundColor: c.hex }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-ink/40">{c.hex}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                  <button onClick={() => setEditing(c)} className="text-clay hover:text-brass">Edit</button>
                  <button onClick={() => setConfirmDelete(c.id)} className="text-ink/40 hover:text-error">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(editing || creating) && (
        <ColourModal swatch={editing} nextOrder={colorSwatches.length} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const c = colorSwatches.find((x) => x.id === confirmDelete);
            deleteColorSwatch(confirmDelete);
            audit("colour.deleted", "products", `Deleted colour "${c?.name}".`, { resourceId: confirmDelete });
          }
        }}
        title="Delete this colour?"
        description="Products and orders that already reference this colour by name are unaffected — it just stops being selectable going forward."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ColourModal({ swatch, nextOrder, onCancel, onSave }: { swatch: ColorSwatch | null; nextOrder: number; onCancel: () => void; onSave: (c: ColorSwatch) => void }) {
  const [form, setForm] = useState<ColorSwatch>(swatch ?? { id: "", name: "", hex: "#15130F", sortOrder: nextOrder });
  function set<K extends keyof ColorSwatch>(key: K, value: ColorSwatch[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={swatch ? `Edit — ${swatch.name}` : "New Colour"}>
      <div className="space-y-4">
        <Field label="Name" required value={form.name} onChange={(v) => set("name", v)} hint="Shown to customers exactly as typed here — keep it consistent across products." />
        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink/60">Swatch</span>
            <input type="color" value={form.hex} onChange={(e) => set("hex", e.target.value)} className="h-[42px] w-16 cursor-pointer border border-line bg-ivory p-1" />
          </label>
          <div className="flex-1">
            <Field label="Hex value" value={form.hex} onChange={(v) => set("hex", v)} />
          </div>
        </div>
        <NumberField label="Sort order" value={form.sortOrder} onChange={(v) => set("sortOrder", v)} min={0} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.name}>Save Colour</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
