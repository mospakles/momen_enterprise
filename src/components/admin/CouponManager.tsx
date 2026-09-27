"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate, formatNaira } from "@/lib/format";
import type { Coupon, DiscountType, PromotionScope } from "@/lib/admin/types";
import { PageHeader, StatCard, StatusPill, Modal, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Field, NumberField, SelectField, Toggle, TagInput } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `cp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function CouponManager({ title, description, scopeFilterDefault = "any" }: { title: string; description: string; scopeFilterDefault?: "any" | PromotionScope }) {
  const { coupons, upsertCoupon, deleteCoupon, collections, products } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"any" | PromotionScope>(scopeFilterDefault);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Captured once on mount rather than read fresh during render, so the
  // "expiring soon" calculation below stays pure/deterministic per render.
  const [nowMs] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (q && !c.code.toLowerCase().includes(q)) return false;
      if (scopeFilter !== "any" && c.scope !== scopeFilter) return false;
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "inactive" && c.active) return false;
      return true;
    });
  }, [coupons, search, scopeFilter, statusFilter]);

  const kpis = useMemo(
    () => ({
      active: coupons.filter((c) => c.active).length,
      usage: coupons.reduce((s, c) => s + c.usageCount, 0),
      expiringSoon: coupons.filter((c) => c.expiresAt && new Date(c.expiresAt).getTime() - nowMs < 14 * 86_400_000 && new Date(c.expiresAt).getTime() > nowMs).length,
    }),
    [coupons, nowMs]
  );

  function save(c: Coupon) {
    const isNew = !coupons.some((x) => x.id === c.id);
    upsertCoupon(c);
    audit(isNew ? "coupon.created" : "coupon.updated", "promotions", `${isNew ? "Created" : "Updated"} coupon "${c.code}".`, { resourceId: c.id });
    setEditing(null);
    setCreating(false);
  }

  const columns: Column<Coupon>[] = [
    { key: "code", label: "Code", render: (c) => <span className="font-mono font-medium">{c.code}</span>, sortValue: (c) => c.code, csvValue: (c) => c.code },
    { key: "type", label: "Discount", render: (c) => (c.type === "percentage" ? `${c.value}%` : formatNaira(c.value)), csvValue: (c) => (c.type === "percentage" ? `${c.value}%` : c.value) },
    { key: "scope", label: "Scope", render: (c) => c.scope.replace(/-/g, " "), sortValue: (c) => c.scope, csvValue: (c) => c.scope },
    { key: "usage", label: "Usage", align: "right", render: (c) => `${c.usageCount}${c.usageLimit ? ` / ${c.usageLimit}` : ""}`, csvValue: (c) => c.usageCount },
    { key: "expires", label: "Expires", render: (c) => (c.expiresAt ? formatDate(c.expiresAt) : "No expiry"), sortValue: (c) => c.expiresAt ?? "", csvValue: (c) => (c.expiresAt ? formatDate(c.expiresAt) : "—") },
    { key: "status", label: "Status", render: (c) => <StatusPill status={c.active ? "active" : "disabled"} />, sortValue: (c) => (c.active ? 1 : 0), csvValue: (c) => (c.active ? "Active" : "Inactive") },
  ];

  return (
    <div>
      <PageHeader title={title} description={description} actions={can("promotions", "create") && <Button onClick={() => setCreating(true)}>New Coupon</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Promotions" value={kpis.active} />
        <StatCard label="Total Redemptions" value={kpis.usage} />
        <StatCard label="Expiring in 14 Days" value={kpis.expiringSoon} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search code…" />
        <FilterSelect ariaLabel="Scope" value={scopeFilter} onChange={setScopeFilter} options={[{ value: "any", label: "All Scopes" }, { value: "all", label: "Sitewide" }, { value: "product", label: "Product" }, { value: "collection", label: "Collection" }, { value: "first-order", label: "First Order" }, { value: "customer", label: "Customer" }]} />
        <FilterSelect ariaLabel="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(c) => c.id} emptyTitle="No promotions match these filters" pageSize={10} onRowClick={(c) => setEditing(c)} />

      {(editing || creating) && (
        <CouponModal
          coupon={editing}
          collections={collections}
          products={products}
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
            const c = coupons.find((x) => x.id === confirmDelete);
            deleteCoupon(confirmDelete);
            audit("coupon.deleted", "promotions", `Deleted coupon "${c?.code}".`, { resourceId: confirmDelete });
          }
          setEditing(null);
        }}
        title="Delete this coupon?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function CouponModal({
  coupon,
  collections,
  products,
  onCancel,
  onSave,
  onDelete,
}: {
  coupon: Coupon | null;
  collections: { slug: string; name: string }[];
  products: { id: string; name: string }[];
  onCancel: () => void;
  onSave: (c: Coupon) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Coupon>(
    coupon ?? { id: "", code: "", type: "percentage", value: 10, scope: "all", scopeRefs: [], usageCount: 0, active: true, createdAt: new Date().toISOString() }
  );
  function set<K extends keyof Coupon>(key: K, value: Coupon[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const scopeOptions =
    form.scope === "collection" ? collections.map((c) => c.name) : form.scope === "product" ? products.map((p) => p.name) : [];

  return (
    <Modal open onClose={onCancel} title={coupon ? `Edit — ${coupon.code}` : "New Coupon"} size="lg">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Coupon Code" required value={form.code} onChange={(v) => set("code", v.toUpperCase())} />
          <SelectField<DiscountType> label="Discount Type" value={form.type} onChange={(v) => set("type", v)} options={[{ value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed Amount" }]} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={form.type === "percentage" ? "Discount (%)" : "Discount (₦)"} value={form.value} onChange={(v) => set("value", v)} />
          <NumberField label="Minimum Order Value (₦)" value={form.minOrderValue ?? 0} onChange={(v) => set("minOrderValue", v || undefined)} />
        </div>
        <SelectField<PromotionScope> label="Applies To" value={form.scope} onChange={(v) => set("scope", v)} options={[{ value: "all", label: "Sitewide" }, { value: "product", label: "Specific Product(s)" }, { value: "collection", label: "Specific Collection(s)" }, { value: "first-order", label: "First Order Only" }, { value: "customer", label: "Specific Customer" }]} />
        {scopeOptions.length > 0 && <TagInput label="Applies to (names)" values={form.scopeRefs ?? []} onChange={(v) => set("scopeRefs", v)} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Usage Limit (optional)" value={form.usageLimit ?? 0} onChange={(v) => set("usageLimit", v || undefined)} />
          <NumberField label="Per-Customer Limit (optional)" value={form.perCustomerLimit ?? 0} onChange={(v) => set("perCustomerLimit", v || undefined)} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink/60">Expiry Date (optional)</span>
          <input type="date" value={form.expiresAt?.slice(0, 10) ?? ""} onChange={(e) => set("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : undefined)} className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass" />
        </label>
        <Toggle label="Active" checked={form.active} onChange={(v) => set("active", v)} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.code}>Save Coupon</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-ink/40 hover:text-error">Delete</button>}
      </div>
    </Modal>
  );
}
