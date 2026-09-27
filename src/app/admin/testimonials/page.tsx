"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { Testimonial } from "@/lib/admin/types";
import { PageHeader, Card, Badge, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { Field, NumberField, TextareaField, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `ts-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminTestimonialsPage() {
  const { testimonials, upsertTestimonial, deleteTestimonial } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(t: Testimonial) {
    const isNew = !testimonials.some((x) => x.id === t.id);
    upsertTestimonial(t);
    audit(isNew ? "testimonial.created" : "testimonial.updated", "content", `${isNew ? "Added" : "Updated"} testimonial from "${t.author}".`, { resourceId: t.id });
    setEditing(null);
    setCreating(false);
  }

  const sorted = [...testimonials].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader title="Testimonials" description="Customer quotes shown on the homepage." actions={can("content", "create") && <Button onClick={() => setCreating(true)}>New Testimonial</Button>} />

      {sorted.length === 0 ? (
        <EmptyState title="No testimonials yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((t) => (
            <Card key={t.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-brass">{"★".repeat(t.rating ?? 5)}</span>
                {t.featured && <Badge tone="brass">Featured</Badge>}
              </div>
              <p className="text-sm italic text-ink/75">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-2 text-xs text-ink/45">{t.author}{t.role ? ` — ${t.role}` : ""}</p>
              <div className="mt-3 flex gap-3 text-xs">
                <button onClick={() => setEditing(t)} className="text-clay hover:text-brass">Edit</button>
                <button onClick={() => setConfirmDelete(t.id)} className="text-ink/40 hover:text-error">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <TestimonialModal testimonial={editing} nextOrder={testimonials.length} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteTestimonial(confirmDelete);
            audit("testimonial.deleted", "content", "Deleted a testimonial.", { resourceId: confirmDelete });
          }
        }}
        title="Delete this testimonial?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function TestimonialModal({ testimonial, nextOrder, onCancel, onSave }: { testimonial: Testimonial | null; nextOrder: number; onCancel: () => void; onSave: (t: Testimonial) => void }) {
  const [form, setForm] = useState<Testimonial>(testimonial ?? { id: "", quote: "", author: "", role: "", rating: 5, featured: false, sortOrder: nextOrder });
  function set<K extends keyof Testimonial>(key: K, value: Testimonial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={testimonial ? "Edit Testimonial" : "New Testimonial"}>
      <div className="space-y-4">
        <TextareaField label="Quote" value={form.quote} onChange={(v) => set("quote", v)} rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Author" required value={form.author} onChange={(v) => set("author", v)} />
          <Field label="Role / Location" value={form.role ?? ""} onChange={(v) => set("role", v)} />
        </div>
        <NumberField label="Rating (1–5)" value={form.rating ?? 5} onChange={(v) => set("rating", Math.min(5, Math.max(1, v)))} />
        <Toggle label="Featured on homepage" checked={form.featured} onChange={(v) => set("featured", v)} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.quote || !form.author}>Save</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
