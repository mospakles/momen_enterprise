"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import type { PublishStatus } from "@/lib/types";
import type { CMSPage } from "@/lib/admin/types";
import { PageHeader, StatusPill, Drawer, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, TextareaField, SelectField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `pg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminPagesPage() {
  const { cmsPages, upsertCmsPage, deleteCmsPage } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<CMSPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(p: CMSPage) {
    const isNew = !cmsPages.some((x) => x.id === p.id);
    upsertCmsPage({ ...p, updatedAt: new Date().toISOString() });
    audit(isNew ? "page.created" : "page.updated", "content", `${isNew ? "Created" : "Updated"} page "${p.title}".`, { resourceId: p.id });
    setEditing(null);
    setCreating(false);
  }

  const columns: Column<CMSPage>[] = [
    { key: "title", label: "Page", render: (p) => <div><p className="font-medium">{p.title}</p><p className="text-xs text-ink/40">/{p.slug}</p></div>, sortValue: (p) => p.title, csvValue: (p) => p.title },
    { key: "status", label: "Status", render: (p) => <StatusPill status={p.status} />, sortValue: (p) => p.status, csvValue: (p) => p.status },
    { key: "updated", label: "Last Updated", render: (p) => formatDate(p.updatedAt), sortValue: (p) => p.updatedAt, csvValue: (p) => formatDate(p.updatedAt) },
  ];

  return (
    <div>
      <PageHeader title="Pages" description="About, policies, guides, and custom landing pages." actions={can("content", "create") && <Button onClick={() => setCreating(true)}>New Page</Button>} />

      <DataTable columns={columns} rows={cmsPages} getRowId={(p) => p.id} pageSize={12} onRowClick={(p) => setEditing(p)} />

      {(editing || creating) && (
        <PageDrawer
          page={editing}
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
            const p = cmsPages.find((x) => x.id === confirmDelete);
            deleteCmsPage(confirmDelete);
            audit("page.deleted", "content", `Deleted page "${p?.title}".`, { resourceId: confirmDelete });
          }
          setEditing(null);
        }}
        title="Delete this page?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function PageDrawer({ page, onCancel, onSave, onDelete }: { page: CMSPage | null; onCancel: () => void; onSave: (p: CMSPage) => void; onDelete?: () => void }) {
  const [form, setForm] = useState<CMSPage>(page ?? { id: "", slug: "", title: "", body: "", status: "draft", updatedAt: new Date().toISOString(), seo: {} });
  function set<K extends keyof CMSPage>(key: K, value: CMSPage[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Drawer open onClose={onCancel} title={page ? `Edit — ${page.title}` : "New Page"} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required value={form.title} onChange={(v) => set("title", v)} />
          <Field label="URL Slug" value={form.slug} onChange={(v) => set("slug", v)} placeholder="auto-generated if blank" />
        </div>
        <TextareaField label="Page Content" value={form.body} onChange={(v) => set("body", v)} rows={10} hint="Supports basic HTML for rich content." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<PublishStatus> label="Status" value={form.status} onChange={(v) => set("status", v)} options={[{ value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} />
          {form.status === "scheduled" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/60">Publish Date</span>
              <input type="datetime-local" value={form.publishAt?.slice(0, 16) ?? ""} onChange={(e) => set("publishAt", new Date(e.target.value).toISOString())} className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass" />
            </label>
          )}
        </div>
        <Field label="SEO Title" value={form.seo.title ?? ""} onChange={(v) => set("seo", { ...form.seo, title: v })} />
        <TextareaField label="Meta Description" value={form.seo.description ?? ""} onChange={(v) => set("seo", { ...form.seo, description: v })} rows={2} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId(), slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} disabled={!form.title}>
          Save Page
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-ink/40 hover:text-error">Delete</button>}
      </div>
    </Drawer>
  );
}
