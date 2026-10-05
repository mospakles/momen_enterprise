"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import type { Product } from "@/lib/types";
import { PageHeader, StatCard, StatusPill, Drawer, Tabs } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { NumberField, TextareaField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function deriveStock(qty: number, threshold: number, current: Product["stock"]): Product["stock"] {
  if (current === "made-to-order") return current;
  if (qty <= 0) return "out-of-stock";
  if (qty <= threshold) return "low-stock";
  return "in-stock";
}

export default function AdminInventoryPage() {
  const { products, upsertProduct, auditLogs } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const history = auditLogs.filter((entry) => entry.resource === "inventory");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Product["stock"]>("all");
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const trackedProducts = useMemo(() => products.filter((p) => p.productionType === "ready-to-wear"), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trackedProducts.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))) return false;
      if (statusFilter !== "all" && p.stock !== statusFilter) return false;
      return true;
    });
  }, [trackedProducts, search, statusFilter]);

  const totals = useMemo(
    () => ({
      skus: trackedProducts.length,
      inStock: trackedProducts.filter((p) => p.stock === "in-stock").length,
      lowStock: trackedProducts.filter((p) => p.stock === "low-stock").length,
      outOfStock: trackedProducts.filter((p) => p.stock === "out-of-stock").length,
      reserved: trackedProducts.reduce((s, p) => s + (p.reservedQuantity ?? 0), 0),
      units: trackedProducts.reduce((s, p) => s + p.stockQuantity, 0),
    }),
    [trackedProducts]
  );

  function adjust(product: Product, delta: number, reason: string) {
    const nextQty = Math.max(0, product.stockQuantity + delta);
    const updated: Product = { ...product, stockQuantity: nextQty, stock: deriveStock(nextQty, product.lowStockThreshold, product.stock), updatedAt: new Date().toISOString() };
    upsertProduct(updated);
    audit("inventory.adjusted", "inventory", `${delta > 0 ? "Added" : "Removed"} ${Math.abs(delta)} unit(s) of "${product.name}" — ${reason}.`, { resourceId: product.id, before: { stockQuantity: product.stockQuantity }, after: { stockQuantity: nextQty } });
    setAdjusting(null);
  }

  const columns: Column<Product>[] = [
    { key: "name", label: "Product", render: (p) => <div><p className="font-medium">{p.name}</p><p className="text-xs text-ink/40">{p.sku}</p></div>, sortValue: (p) => p.name, csvValue: (p) => p.name },
    { key: "category", label: "Category", render: (p) => p.category, sortValue: (p) => p.category, csvValue: (p) => p.category },
    { key: "qty", label: "In Stock", align: "right", render: (p) => p.stockQuantity, sortValue: (p) => p.stockQuantity, csvValue: (p) => p.stockQuantity },
    { key: "reserved", label: "Reserved", align: "right", render: (p) => p.reservedQuantity ?? 0, sortValue: (p) => p.reservedQuantity ?? 0, csvValue: (p) => p.reservedQuantity ?? 0 },
    { key: "available", label: "Available", align: "right", render: (p) => Math.max(0, p.stockQuantity - (p.reservedQuantity ?? 0)), sortValue: (p) => p.stockQuantity - (p.reservedQuantity ?? 0), csvValue: (p) => p.stockQuantity - (p.reservedQuantity ?? 0) },
    { key: "threshold", label: "Low-Stock Alert", align: "right", render: (p) => p.lowStockThreshold, sortValue: (p) => p.lowStockThreshold, csvValue: (p) => p.lowStockThreshold },
    { key: "status", label: "Status", render: (p) => <StatusPill status={p.stock} />, sortValue: (p) => p.stock, csvValue: (p) => p.stock },
    {
      key: "actions",
      label: "",
      render: (p) =>
        can("inventory", "edit") && (
          <button onClick={(e) => { e.stopPropagation(); setAdjusting(p); }} className="text-xs text-clay hover:text-brass">
            Adjust
          </button>
        ),
      csvValue: () => "",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock tracking for ready-to-wear products. Made-to-measure pieces are produced on order and untracked here."
        actions={
          <button onClick={() => setHistoryOpen(true)} className="border border-line px-3.5 py-2.5 text-xs hover:border-brass">
            View History
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Tracked SKUs" value={totals.skus} />
        <StatCard label="In Stock" value={totals.inStock} />
        <StatCard label="Low Stock" value={totals.lowStock} />
        <StatCard label="Out of Stock" value={totals.outOfStock} />
        <StatCard label="Reserved Units" value={totals.reserved} />
        <StatCard label="Total Units" value={totals.units} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or SKU…" />
        <FilterSelect ariaLabel="Stock status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Stock Statuses" }, { value: "in-stock", label: "In Stock" }, { value: "low-stock", label: "Low Stock" }, { value: "out-of-stock", label: "Out of Stock" }]} />
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(p) => p.id} emptyTitle="No tracked products match these filters" pageSize={12} />

      {adjusting && <AdjustModal product={adjusting} onCancel={() => setAdjusting(null)} onAdjust={adjust} />}

      <Drawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="Inventory History" wide>
        {history.length === 0 ? (
          <p className="text-sm text-ink/45">No inventory adjustments recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="border-b border-line pb-3 text-sm">
                <p className="font-medium">{h.summary}</p>
                <p className="text-xs text-ink/45">{h.actorName} · {formatDate(h.date)}</p>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </div>
  );
}

function AdjustModal({ product, onCancel, onAdjust }: { product: Product; onCancel: () => void; onAdjust: (p: Product, delta: number, reason: string) => void }) {
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm border border-line bg-ivory p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 font-display text-xl">Adjust Stock</h2>
        <p className="mb-5 text-sm text-ink/50">{product.name} — currently {product.stockQuantity} unit(s)</p>
        <Tabs tabs={[{ key: "add", label: "Add Inventory" }, { key: "remove", label: "Remove Inventory" }]} active={mode} onChange={(k) => setMode(k as "add" | "remove")} />
        <div className="mt-4 space-y-4">
          <NumberField label="Quantity" value={amount} onChange={setAmount} min={1} />
          <TextareaField label="Reason" value={reason} onChange={setReason} rows={2} hint='e.g. "New stock delivery" or "Damaged in QC"' />
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => onAdjust(product, mode === "add" ? amount : -amount, reason || (mode === "add" ? "Stock received" : "Stock removed"))}>Confirm</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
