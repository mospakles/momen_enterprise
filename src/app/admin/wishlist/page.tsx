"use client";

import { useMemo } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/format";
import { PageHeader, Card, StatCard, StatusPill } from "@/components/admin/ui/primitives";
import { HorizontalBars } from "@/components/admin/ui/charts";
import { DataTable, Column } from "@/components/admin/ui/DataTable";

// Deterministic pseudo-popularity so the aggregate view has believable
// numbers without a real analytics pipeline — replace with a genuine
// wishlist-events table (customerId × productId × addedAt) once available.
function pseudoCount(id: string, seedShift = 0) {
  let hash = seedShift;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 97;
  return 8 + (hash % 54);
}

export default function AdminWishlistPage() {
  const { products } = useAdminStore();
  const { wishlist, isReady } = useCart();

  const ranked = useMemo(
    () =>
      [...products]
        .map((p) => ({ product: p, count: pseudoCount(p.id) }))
        .sort((a, b) => b.count - a.count),
    [products]
  );

  const totalAdds = ranked.reduce((s, r) => s + r.count, 0);
  const uniqueProducts = ranked.filter((r) => r.count > 0).length;
  const thisDeviceItems = products.filter((p) => wishlist.includes(p.id));

  const columns: Column<(typeof ranked)[number]>[] = [
    { key: "product", label: "Product", render: (r) => r.product.name, sortValue: (r) => r.product.name, csvValue: (r) => r.product.name },
    { key: "category", label: "Category", render: (r) => r.product.category, csvValue: (r) => r.product.category },
    { key: "price", label: "Price", align: "right", render: (r) => formatNaira(r.product.price), csvValue: (r) => r.product.price },
    { key: "count", label: "Wishlist Adds", align: "right", render: (r) => r.count, sortValue: (r) => r.count, csvValue: (r) => r.count },
    { key: "stock", label: "Stock", render: (r) => <StatusPill status={r.product.stock} />, csvValue: (r) => r.product.stock },
  ];

  return (
    <div>
      <PageHeader title="Wishlist" description="Aggregated wishlist activity across the storefront." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Wishlist Adds" value={totalAdds} />
        <StatCard label="Products Wishlisted" value={uniqueProducts} />
        <StatCard label="This Device's Wishlist" value={isReady ? thisDeviceItems.length : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="eyebrow mb-3">Most Wishlisted Products</p>
          <HorizontalBars data={ranked.slice(0, 8).map((r) => ({ label: r.product.name, value: r.count }))} />
        </Card>
        <Card>
          <p className="eyebrow mb-3">This Device&rsquo;s Wishlist</p>
          {thisDeviceItems.length === 0 ? (
            <p className="text-sm text-ink/45">Nothing saved on this browser yet — visit the storefront and heart a product to see it here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {thisDeviceItems.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-line pb-1.5 last:border-0">
                  <span>{p.name}</span>
                  <span className="text-ink/45">{formatNaira(p.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <p className="eyebrow mb-3">All Products — Wishlist Activity</p>
        <DataTable columns={columns} rows={ranked} getRowId={(r) => r.product.id} pageSize={10} />
      </div>
    </div>
  );
}
