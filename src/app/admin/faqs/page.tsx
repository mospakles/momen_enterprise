"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { FAQItem } from "@/lib/admin/types";
import { PageHeader, Card, Badge, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { Field, TextareaField, Toggle } from "@/components/admin/ui/form";
import { FilterBar, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Button } from "@/components/ui/Button";

function genId() {
  return `faq-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminFaqsPage() {
  const { faqs, upsertFaq, deleteFaq } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(faqs.map((f) => f.category))).sort(), [faqs]);
  const filtered = useMemo(() => (categoryFilter === "all" ? faqs : faqs.filter((f) => f.category === categoryFilter)), [faqs, categoryFilter]);
  const grouped = useMemo(() => {
    const map = new Map<string, FAQItem[]>();
    [...filtered].sort((a, b) => a.sortOrder - b.sortOrder).forEach((f) => map.set(f.category, [...(map.get(f.category) ?? []), f]));
    return map;
  }, [filtered]);

  function save(f: FAQItem) {
    const isNew = !faqs.some((x) => x.id === f.id);
    upsertFaq(f);
    audit(isNew ? "faq.created" : "faq.updated", "content", `${isNew ? "Added" : "Updated"} FAQ "${f.question}".`, { resourceId: f.id });
    setEditing(null);
    setCreating(false);
  }

  return (
    <div>
      <PageHeader title="FAQs" description="Frequently asked questions shown across the storefront." actions={can("content", "create") && <Button onClick={() => setCreating(true)}>New FAQ</Button>} />

      <FilterBar>
        <FilterSelect ariaLabel="Category" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c, label: c }))]} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No FAQs yet" />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <p className="eyebrow mb-2">{category}</p>
              <div className="space-y-2">
                {items.map((f) => (
                  <Card key={f.id} className="!py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{f.question}</p>
                        <p className="mt-1 text-sm text-ink/55">{f.answer}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!f.published && <Badge>Draft</Badge>}
                        <button onClick={() => setEditing(f)} className="text-xs text-clay hover:text-brass">Edit</button>
                        <button onClick={() => setConfirmDelete(f.id)} className="text-xs text-ink/40 hover:text-error">Delete</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <FaqModal faq={editing} nextOrder={faqs.length} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteFaq(confirmDelete);
            audit("faq.deleted", "content", "Deleted an FAQ.", { resourceId: confirmDelete });
          }
        }}
        title="Delete this FAQ?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function FaqModal({ faq, nextOrder, onCancel, onSave }: { faq: FAQItem | null; nextOrder: number; onCancel: () => void; onSave: (f: FAQItem) => void }) {
  const [form, setForm] = useState<FAQItem>(faq ?? { id: "", question: "", answer: "", category: "General", sortOrder: nextOrder, published: true });
  function set<K extends keyof FAQItem>(key: K, value: FAQItem[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={faq ? "Edit FAQ" : "New FAQ"}>
      <div className="space-y-4">
        <Field label="Question" required value={form.question} onChange={(v) => set("question", v)} />
        <TextareaField label="Answer" value={form.answer} onChange={(v) => set("answer", v)} rows={3} />
        <Field label="Category" value={form.category} onChange={(v) => set("category", v)} />
        <Toggle label="Published" checked={form.published} onChange={(v) => set("published", v)} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.question}>Save</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
