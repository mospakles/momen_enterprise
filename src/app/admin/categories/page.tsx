"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { Category, PublishStatus } from "@/lib/types";
import { PageHeader, StatusPill, Modal, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, TextareaField, SelectField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `cat-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminCategoriesPage() {
  const { categories, products, upsertCategory, deleteCategory } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);

  function save(c: Category) {
    const isNew = !categories.some((x) => x.id === c.id);
    upsertCategory(c);
    audit(isNew ? "category.created" : "category.updated", "collections", `${isNew ? "Created" : "Updated"} category "${c.name}".`, { resourceId: c.id });
    setEditing(null);
    setCreating(false);
  }

  const columns: Column<Category>[] = [
    { key: "name", label: "Category", render: (c) => c.name, sortValue: (c) => c.name, csvValue: (c) => c.name },
    { key: "slug", label: "Slug", render: (c) => c.slug, sortValue: (c) => c.slug, csvValue: (c) => c.slug },
    { key: "count", label: "Products", align: "right", render: (c) => products.filter((p) => p.category === c.name).length, sortValue: (c) => products.filter((p) => p.category === c.name).length, csvValue: (c) => products.filter((p) => p.category === c.name).length },
    { key: "status", label: "Status", render: (c) => <StatusPill status={c.publishStatus} />, sortValue: (c) => c.publishStatus, csvValue: (c) => c.publishStatus },
  ];

  return (
    <div>
      <PageHeader title="Categories" description={`${categories.length} categories`} actions={can("collections", "create") && <Button onClick={() => setCreating(true)}>New Category</Button>} />

      <DataTable columns={columns} rows={sorted} getRowId={(c) => c.id} emptyTitle="No categories yet" pageSize={12} onRowClick={(c) => setEditing(c)} />

      {(editing || creating) && (
        <CategoryModal
          category={editing}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={save}
          onDelete={editing ? () => setConfirmDelete(editing.id) : undefined}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const c = categories.find((x) => x.id === confirmDelete);
            deleteCategory(confirmDelete);
            audit("category.deleted", "collections", `Deleted category "${c?.name}".`, { resourceId: confirmDelete });
          }
          setEditing(null);
        }}
        title="Delete this category?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function CategoryModal({ category, onCancel, onSave, onDelete }: { category: Category | null; onCancel: () => void; onSave: (c: Category) => void; onDelete?: () => void }) {
  const [form, setForm] = useState<Category>(
    category ?? { id: "", slug: "", name: "", description: "", sortOrder: 0, publishStatus: "published", seo: {} }
  );

  function set<K extends keyof Category>(key: K, value: Category[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal open onClose={onCancel} title={category ? `Edit — ${category.name}` : "New Category"}>
      <div className="space-y-4">
        <Field label="Name" required value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Slug" value={form.slug} onChange={(v) => set("slug", v)} placeholder="auto-generated if blank" />
        <TextareaField label="Description" value={form.description ?? ""} onChange={(v) => set("description", v)} rows={2} />
        <SelectField<PublishStatus> label="Status" value={form.publishStatus} onChange={(v) => set("publishStatus", v)} options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button
          onClick={() => {
            const withId = form.id ? form : { ...form, id: genId(), slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") };
            onSave(withId);
          }}
        >
          Save
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        {onDelete && (
          <button onClick={onDelete} className="ml-auto text-xs text-ink/40 hover:text-error">Delete</button>
        )}
      </div>
    </Modal>
  );
}
