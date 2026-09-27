"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { SizeOption } from "@/lib/types";
import { PageHeader, Card, StatusPill, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { Field, NumberField, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `size-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminSizesPage() {
  const { sizeOptions, upsertSizeOption, deleteSizeOption } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<SizeOption | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(s: SizeOption) {
    const isNew = !sizeOptions.some((x) => x.id === s.id);
    upsertSizeOption(s);
    audit(isNew ? "size.created" : "size.updated", "products", `${isNew ? "Added" : "Updated"} size "${s.label}".`, { resourceId: s.id });
    setEditing(null);
    setCreating(false);
  }

  function move(id: string, dir: -1 | 1) {
    const sorted = [...sizeOptions].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === id);
    const swapWith = idx + dir;
    if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapWith];
    upsertSizeOption({ ...a, sortOrder: b.sortOrder });
    upsertSizeOption({ ...b, sortOrder: a.sortOrder });
  }

  const sorted = [...sizeOptions].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title="Sizes"
        description="The canonical size run products reference from a checklist in the product editor. Garments outside the standard run (shoe sizes, numeric waists, One Size) still enter sizes as free text per product."
        actions={can("products", "create") && <Button onClick={() => setCreating(true)}>New Size</Button>}
      />

      {sorted.length === 0 ? (
        <EmptyState title="No sizes yet" />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink/50">
                <th className="p-4 font-normal">Label</th>
                <th className="p-4 font-normal">Status</th>
                <th className="p-4 font-normal">Order</th>
                <th className="p-4 font-normal" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="p-4 font-medium">{s.label}</td>
                  <td className="p-4"><StatusPill status={s.active ? "active" : "disabled"} /></td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-xs">
                      <button onClick={() => move(s.id, -1)} disabled={i === 0} className="text-ink/40 hover:text-brass disabled:opacity-20">▲</button>
                      <button onClick={() => move(s.id, 1)} disabled={i === sorted.length - 1} className="text-ink/40 hover:text-brass disabled:opacity-20">▼</button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setEditing(s)} className="text-xs text-clay hover:text-brass">Edit</button>
                    <button onClick={() => setConfirmDelete(s.id)} className="ml-3 text-xs text-ink/40 hover:text-error">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(editing || creating) && (
        <SizeModal size={editing} nextOrder={sizeOptions.length} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const s = sizeOptions.find((x) => x.id === confirmDelete);
            deleteSizeOption(confirmDelete);
            audit("size.deleted", "products", `Deleted size "${s?.label}".`, { resourceId: confirmDelete });
          }
        }}
        title="Delete this size?"
        description="Products already carrying this size label keep it as free text — only the checklist entry is removed."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function SizeModal({ size, nextOrder, onCancel, onSave }: { size: SizeOption | null; nextOrder: number; onCancel: () => void; onSave: (s: SizeOption) => void }) {
  const [form, setForm] = useState<SizeOption>(size ?? { id: "", label: "", sortOrder: nextOrder, active: true });
  function set<K extends keyof SizeOption>(key: K, value: SizeOption[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={size ? `Edit — ${size.label}` : "New Size"}>
      <div className="space-y-4">
        <Field label="Label" required value={form.label} onChange={(v) => set("label", v)} hint="e.g. XS, S, M, L, XL" />
        <NumberField label="Sort order" value={form.sortOrder} onChange={(v) => set("sortOrder", v)} min={0} />
        <Toggle label="Active" checked={form.active} onChange={(v) => set("active", v)} hint="Inactive sizes stop appearing in the product editor checklist." />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.label}>Save Size</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
