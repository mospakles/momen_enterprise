"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { apiRequest } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { PageHeader, Card, StatCard, StatusPill } from "@/components/admin/ui/primitives";
import { HorizontalBars } from "@/components/admin/ui/charts";
import { DataTable, Column } from "@/components/admin/ui/DataTable";

export default function AdminWishlistPage() {
  const { products } = useAdminStore();
  const [activity, setActivity] = useState<Array<{ productId: string; count: number }>>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void apiRequest<Array<{ productId: string; count: number }>>("/admin/wishlist")
      .then(setActivity)
      .finally(() => setIsReady(true));
  }, []);

  const ranked = useMemo(
    () =>
      activity
        .map((row) => ({ product: products.find((product) => product.id === row.productId), count: row.count }))
        .filter((row): row is { product: (typeof products)[number]; count: number } => Boolean(row.product))
        .sort((a, b) => b.count - a.count),
    [activity, products]
  );

  const totalAdds = ranked.reduce((s, r) => s + r.count, 0);
  const uniqueProducts = ranked.filter((r) => r.count > 0).length;

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

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Wishlist Adds" value={isReady ? totalAdds : "—"} />
        <StatCard label="Products Wishlisted" value={isReady ? uniqueProducts : "—"} />
      </div>

      <div className="grid gap-4">
        <Card>
          <p className="eyebrow mb-3">Most Wishlisted Products</p>
          <HorizontalBars data={ranked.slice(0, 8).map((r) => ({ label: r.product.name, value: r.count }))} />
        </Card>
      </div>

      <div className="mt-6">
        <p className="eyebrow mb-3">All Products — Wishlist Activity</p>
        <DataTable columns={columns} rows={ranked} getRowId={(r) => r.product.id} pageSize={10} />
      </div>
    </div>
  );
}
