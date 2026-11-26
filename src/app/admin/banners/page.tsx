"use client";

import { useState } from "react";
import Image from "next/image";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { Banner } from "@/lib/admin/types";
import { PageHeader, Card, StatusPill, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { Field, SelectField, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `bn-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminBannersPage() {
  const { banners, upsertBanner, deleteBanner } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(b: Banner) {
    const isNew = !banners.some((x) => x.id === b.id);
    upsertBanner(b);
    audit(isNew ? "banner.created" : "banner.updated", "content", `${isNew ? "Created" : "Updated"} banner "${b.title}".`, { resourceId: b.id });
    setEditing(null);
    setCreating(false);
  }

  return (
    <div>
      <PageHeader title="Banners" description="Promotional banners across the homepage and shop." actions={can("content", "create") && <Button onClick={() => setCreating(true)}>New Banner</Button>} />

      {banners.length === 0 ? (
        <EmptyState title="No banners yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...banners].sort((a, b) => a.sortOrder - b.sortOrder).map((b) => (
            <Card key={b.id} className="!p-0 overflow-hidden">
              <div className="relative h-28 w-full bg-ivory-deep">
                {b.image && <Image src={b.image} alt="" fill className="object-cover" sizes="360px" unoptimized />}
              </div>
              <div className="p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="font-medium">{b.title}</p>
                  <StatusPill status={b.active ? "active" : "disabled"} />
                </div>
                <p className="mb-2 text-xs text-ink/45">{b.placement.replace(/-/g, " ")}</p>
                <button onClick={() => setEditing(b)} className="text-xs text-clay hover:text-brass">Edit</button>
                <button onClick={() => setConfirmDelete(b.id)} className="ml-3 text-xs text-ink/40 hover:text-error">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <BannerModal banner={editing} nextOrder={banners.length} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const b = banners.find((x) => x.id === confirmDelete);
            deleteBanner(confirmDelete);
            audit("banner.deleted", "content", `Deleted banner "${b?.title}".`, { resourceId: confirmDelete });
          }
        }}
        title="Delete this banner?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function BannerModal({ banner, nextOrder, onCancel, onSave }: { banner: Banner | null; nextOrder: number; onCancel: () => void; onSave: (b: Banner) => void }) {
  const [form, setForm] = useState<Banner>(
    banner ?? { id: "", title: "", subtitle: "", image: "", ctaLabel: "", ctaHref: "", placement: "homepage-promo", active: true, sortOrder: nextOrder }
  );
  function set<K extends keyof Banner>(key: K, value: Banner[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={banner ? `Edit — ${banner.title}` : "New Banner"} size="lg">
      <div className="space-y-4">
        <Field label="Title" required value={form.title} onChange={(v) => set("title", v)} />
        <Field label="Subtitle" value={form.subtitle ?? ""} onChange={(v) => set("subtitle", v)} />
        <Field label="Image URL" value={form.image} onChange={(v) => set("image", v)} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="CTA Label" value={form.ctaLabel ?? ""} onChange={(v) => set("ctaLabel", v)} />
          <Field label="CTA Link" value={form.ctaHref ?? ""} onChange={(v) => set("ctaHref", v)} />
        </div>
        <SelectField label="Placement" value={form.placement} onChange={(v) => set("placement", v)} options={[{ value: "homepage-top", label: "Homepage — Top" }, { value: "homepage-promo", label: "Homepage — Promo" }, { value: "shop-top", label: "Shop — Top" }, { value: "sitewide", label: "Sitewide" }]} />
        <Toggle label="Active" checked={form.active} onChange={(v) => set("active", v)} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.title}>Save Banner</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
