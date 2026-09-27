"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { NavigationItem } from "@/lib/admin/types";
import { PageHeader, Card, Modal, EmptyState } from "@/components/admin/ui/primitives";
import { Field } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `nav-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminNavigationPage() {
  const { navigationItems, setNavigationItems } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<NavigationItem | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = [...navigationItems].sort((a, b) => a.sortOrder - b.sortOrder);

  function move(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((n) => n.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    setNavigationItems((prev) => prev.map((n) => (n.id === a.id ? { ...n, sortOrder: b.sortOrder } : n.id === b.id ? { ...n, sortOrder: a.sortOrder } : n)));
  }

  function remove(id: string) {
    setNavigationItems((prev) => prev.filter((n) => n.id !== id));
    audit("navigation.item_deleted", "content", "Removed a navigation item.", { resourceId: id });
  }

  function save(item: NavigationItem) {
    const isNew = !navigationItems.some((n) => n.id === item.id);
    setNavigationItems((prev) => (isNew ? [...prev, item] : prev.map((n) => (n.id === item.id ? item : n))));
    audit(isNew ? "navigation.item_created" : "navigation.item_updated", "content", `${isNew ? "Added" : "Updated"} navigation item "${item.label}".`, { resourceId: item.id });
    setEditing(null);
    setCreating(false);
  }

  return (
    <div>
      <PageHeader
        title="Navigation"
        description="Secondary quick links (footer / mobile). The primary Clothing, Collections, and Accessories mega-menu is structured to match the Momen brand taxonomy and is managed via Categories and Collections."
        actions={can("content", "create") && <Button onClick={() => setCreating(true)}>Add Link</Button>}
      />

      {sorted.length === 0 ? (
        <EmptyState title="No navigation items yet" />
      ) : (
        <div className="space-y-2">
          {sorted.map((n, i) => (
            <Card key={n.id} className="flex items-center justify-between !py-3">
              <div>
                <p className="font-medium">{n.label}</p>
                <p className="text-xs text-ink/40">{n.href}</p>
              </div>
              {can("content", "edit") && (
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => move(n.id, -1)} disabled={i === 0} className="border border-line px-2 py-1 hover:border-brass disabled:opacity-30">↑</button>
                  <button onClick={() => move(n.id, 1)} disabled={i === sorted.length - 1} className="border border-line px-2 py-1 hover:border-brass disabled:opacity-30">↓</button>
                  <button onClick={() => setEditing(n)} className="border border-line px-2.5 py-1 hover:border-brass">Edit</button>
                  <button onClick={() => remove(n.id)} className="border border-error/40 px-2.5 py-1 text-error hover:bg-error/5">Remove</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ItemModal item={editing} nextOrder={navigationItems.length} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}
    </div>
  );
}

function ItemModal({ item, nextOrder, onCancel, onSave }: { item: NavigationItem | null; nextOrder: number; onCancel: () => void; onSave: (n: NavigationItem) => void }) {
  const [form, setForm] = useState<NavigationItem>(item ?? { id: genId(), label: "", href: "/", sortOrder: nextOrder });
  return (
    <Modal open onClose={onCancel} title={item ? "Edit Link" : "Add Link"}>
      <div className="space-y-4">
        <Field label="Label" required value={form.label} onChange={(v) => setForm({ ...form, label: v })} />
        <Field label="URL" required value={form.href} onChange={(v) => setForm({ ...form, href: v })} placeholder="/shop" />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form)} disabled={!form.label || !form.href}>Save</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
