"use client";

import { useState } from "react";
import Image from "next/image";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatNaira } from "@/lib/format";
import type { Fabric } from "@/lib/types";
import { PageHeader, Card, StatusPill, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { Field, NumberField, TextareaField, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `fab-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminFabricsPage() {
  const { fabrics, upsertFabric, deleteFabric } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<Fabric | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(f: Fabric) {
    const isNew = !fabrics.some((x) => x.id === f.id);
    upsertFabric(f);
    audit(isNew ? "fabric.created" : "fabric.updated", "products", `${isNew ? "Added" : "Updated"} fabric "${f.name}".`, { resourceId: f.id });
    setEditing(null);
    setCreating(false);
  }

  const sorted = [...fabrics].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title="Fabrics"
        description="The fabric library customers choose from in the Made-to-Measure customization wizard. Pricing here drives the dynamic cost shown at checkout."
        actions={can("products", "create") && <Button onClick={() => setCreating(true)}>New Fabric</Button>}
      />

      {sorted.length === 0 ? (
        <EmptyState title="No fabrics yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((f) => (
            <Card key={f.id} className="!p-0 overflow-hidden">
              <div className="relative h-32 w-full bg-ivory-deep">
                {f.image ? <Image src={f.image} alt="" fill className="object-cover" sizes="360px" unoptimized /> : <span className="absolute inset-0 flex items-center justify-center text-xs text-ink/40">No swatch photo</span>}
              </div>
              <div className="p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="font-medium">{f.name}</p>
                  <StatusPill status={f.available ? "active" : "disabled"} />
                </div>
                <p className="mb-1 text-xs text-ink/45">{f.category}</p>
                <p className="mb-3 text-sm text-ink/60">{f.additionalCost > 0 ? `+${formatNaira(f.additionalCost)}` : "Included in base price"}</p>
                <button onClick={() => setEditing(f)} className="text-xs text-clay hover:text-brass">Edit</button>
                <button onClick={() => setConfirmDelete(f.id)} className="ml-3 text-xs text-ink/40 hover:text-error">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <FabricModal fabric={editing} nextOrder={fabrics.length} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const f = fabrics.find((x) => x.id === confirmDelete);
            deleteFabric(confirmDelete);
            audit("fabric.deleted", "products", `Deleted fabric "${f?.name}".`, { resourceId: confirmDelete });
          }
        }}
        title="Delete this fabric?"
        description="Products referencing this fabric will simply no longer offer it as an option."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function FabricModal({ fabric, nextOrder, onCancel, onSave }: { fabric: Fabric | null; nextOrder: number; onCancel: () => void; onSave: (f: Fabric) => void }) {
  const [form, setForm] = useState<Fabric>(
    fabric ?? { id: "", name: "", category: "Cotton", image: "", description: "", additionalCost: 0, available: true, sortOrder: nextOrder }
  );
  function set<K extends keyof Fabric>(key: K, value: Fabric[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={fabric ? `Edit — ${fabric.name}` : "New Fabric"}>
      <div className="space-y-4">
        <Field label="Name" required value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Category" value={form.category} onChange={(v) => set("category", v)} hint="e.g. Cotton, Linen, Wool, Senator, Ankara, Aso-Oke, Other" />
        <Field label="Image URL" value={form.image} onChange={(v) => set("image", v)} />
        <TextareaField label="Description" value={form.description} onChange={(v) => set("description", v)} rows={2} />
        <NumberField label="Additional Cost (₦)" value={form.additionalCost} onChange={(v) => set("additionalCost", v)} min={0} />
        <Toggle label="Available for selection" checked={form.available} onChange={(v) => set("available", v)} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.name}>Save Fabric</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
