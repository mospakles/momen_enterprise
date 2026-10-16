"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { Collection, PublishStatus } from "@/lib/types";
import { PageHeader, Card, StatusPill, Drawer, ConfirmDialog, EmptyState } from "@/components/admin/ui/primitives";
import { Field, TextareaField, SelectField, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `col-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const emptyCollection = (): Collection => ({
  id: "",
  slug: "",
  name: "",
  description: "",
  image: "",
  productSlugs: [],
  publishStatus: "draft",
  expressEligible: true,
  sortOrder: 0,
  seo: {},
});

export default function AdminCollectionsPage() {
  const { collections, products, upsertCollection, deleteCollection } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<Collection | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = useMemo(() => [...collections].sort((a, b) => a.sortOrder - b.sortOrder), [collections]);

  function move(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((c) => c.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    upsertCollection({ ...a, sortOrder: b.sortOrder });
    upsertCollection({ ...b, sortOrder: a.sortOrder });
  }

  function save(c: Collection) {
    const isNew = !collections.some((x) => x.id === c.id);
    upsertCollection(c);
    audit(isNew ? "collection.created" : "collection.updated", "collections", `${isNew ? "Created" : "Updated"} collection "${c.name}".`, { resourceId: c.id });
    setEditing(null);
    setCreating(false);
  }

  return (
    <div>
      <PageHeader
        title="Collections"
        description={`${collections.length} collections`}
        actions={can("collections", "create") && <Button onClick={() => setCreating(true)}>New Collection</Button>}
      />

      {sorted.length === 0 ? (
        <EmptyState title="No collections yet" action={<Button onClick={() => setCreating(true)}>New Collection</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c, i) => {
            const count = products.filter((p) => p.collectionSlugs.includes(c.slug)).length;
            return (
              <Card key={c.id} className="!p-0 overflow-hidden">
                <div className="relative h-32 w-full bg-ivory-deep">
                  {c.image && <Image src={c.image} alt="" fill className="object-cover" sizes="360px" />}
                  {c.tag && <span className="absolute left-2 top-2 bg-ink px-2 py-1 text-[10px] uppercase tracking-wide text-ivory">{c.tag}</span>}
                </div>
                <div className="p-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="font-medium">{c.name}</p>
                    <StatusPill status={c.publishStatus} />
                  </div>
                  <p className="mb-3 text-xs text-ink/50">{count} product(s) assigned</p>
                  <div className="flex items-center gap-3 text-xs">
                    <button onClick={() => setEditing(c)} className="text-clay hover:text-brass">Edit</button>
                    <button onClick={() => move(c.id, -1)} disabled={i === 0} className="text-ink/40 hover:text-brass disabled:opacity-30">↑</button>
                    <button onClick={() => move(c.id, 1)} disabled={i === sorted.length - 1} className="text-ink/40 hover:text-brass disabled:opacity-30">↓</button>
                    <button onClick={() => setConfirmDelete(c.id)} className="ml-auto text-ink/40 hover:text-error">Delete</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <CollectionDrawer
          collection={editing}
          products={products}
          nextSortOrder={collections.length}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const c = collections.find((x) => x.id === confirmDelete);
            deleteCollection(confirmDelete);
            audit("collection.deleted", "collections", `Deleted collection "${c?.name}".`, { resourceId: confirmDelete });
          }
        }}
        title="Delete this collection?"
        description="Products stay in the catalog but will no longer be grouped under this collection."
        confirmLabel="Delete Collection"
        danger
      />
    </div>
  );
}

function CollectionDrawer({
  collection,
  products,
  nextSortOrder,
  onCancel,
  onSave,
}: {
  collection: Collection | null;
  products: { id: string; slug: string; name: string }[];
  nextSortOrder: number;
  onCancel: () => void;
  onSave: (c: Collection) => void;
}) {
  const [form, setForm] = useState<Collection>(collection ?? { ...emptyCollection(), sortOrder: nextSortOrder });

  function set<K extends keyof Collection>(key: K, value: Collection[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleProduct(slug: string) {
    const list = form.productSlugs ?? [];
    set("productSlugs", list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

  function handleSave() {
    const withId = form.id
      ? form
      : { ...form, id: genId(), slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") };
    onSave(withId);
  }

  return (
    <Drawer open onClose={onCancel} title={collection ? `Edit — ${collection.name}` : "New Collection"} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required value={form.name} onChange={(v) => set("name", v)} />
          <Field label="Slug" value={form.slug} onChange={(v) => set("slug", v)} placeholder="auto-generated if blank" />
        </div>
        <TextareaField label="Description" value={form.description} onChange={(v) => set("description", v)} rows={3} />
        <Field label="Image URL" value={form.image} onChange={(v) => set("image", v)} />
        <Field label="Tag (optional badge, e.g. New)" value={form.tag ?? ""} onChange={(v) => set("tag", v)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<PublishStatus> label="Status" value={form.publishStatus} onChange={(v) => set("publishStatus", v)} options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} />
          <div className="flex items-end pb-2.5">
            <Toggle label="Eligible for Express" checked={form.expressEligible} onChange={(v) => set("expressEligible", v)} />
          </div>
        </div>

        <Card>
          <p className="eyebrow mb-3">Assigned Products ({(form.productSlugs ?? []).length})</p>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 border-b border-line py-1.5 text-sm last:border-0">
                <input type="checkbox" checked={(form.productSlugs ?? []).includes(p.slug)} onChange={() => toggleProduct(p.slug)} className="accent-brass" />
                {p.name}
              </label>
            ))}
          </div>
        </Card>

        <Field label="SEO Title" value={form.seo.title ?? ""} onChange={(v) => set("seo", { ...form.seo, title: v })} />
        <TextareaField label="Meta Description" value={form.seo.description ?? ""} onChange={(v) => set("seo", { ...form.seo, description: v })} rows={2} />
      </div>

      <div className="mt-6 flex gap-3 border-t border-line pt-5">
        <Button onClick={handleSave}>Save Collection</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Drawer>
  );
}
