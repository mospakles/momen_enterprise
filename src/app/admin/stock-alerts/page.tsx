"use client";

// Back-in-stock and price-drop requests from the storefront. Alerts are sent
// automatically when a product changes; "Check now" re-runs that check.

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate, formatNaira } from "@/lib/format";
import { toast } from "@/lib/toast";
import { PageHeader, Card, StatCard, StatusPill } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";

interface AlertRow {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  email: string;
  kind: "back_in_stock" | "price_drop";
  size?: string;
  color?: string;
  priceAtSignup?: number;
  notifiedAt?: string;
  createdAt: string;
}

export default function AdminStockAlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    void apiRequest<AlertRow[]>("/admin/stock-alerts")
      .then(setRows)
      .catch(() => toast("Could not load alerts", { variant: "error" }))
      .finally(() => setReady(true));
  }, []);
  useEffect(load, [load]);

  const waiting = rows.filter((r) => !r.notifiedAt);
  const demand = useMemo(() => {
    const byProduct = new Map<string, number>();
    waiting.forEach((r) => byProduct.set(r.productName, (byProduct.get(r.productName) ?? 0) + 1));
    return [...byProduct].sort((a, b) => b[1] - a[1])[0];
  }, [waiting]);

  async function checkNow(productId: string) {
    try {
      const { sent } = await apiRequest<{ sent: number }>(`/admin/stock-alerts/check/${productId}`, { method: "POST" });
      toast(sent ? `${sent} alert${sent === 1 ? "" : "s"} sent` : "Nothing to send yet", { variant: "success" });
      load();
    } catch (error) {
      toast("Check failed", { description: error instanceof Error ? error.message : undefined, variant: "error" });
    }
  }

  const columns: Column<AlertRow>[] = [
    { key: "product", label: "Product", render: (r) => r.productName, sortValue: (r) => r.productName, csvValue: (r) => r.productName },
    { key: "kind", label: "Wants", render: (r) => (r.kind === "back_in_stock" ? "Back in stock" : "Price drop"), csvValue: (r) => r.kind },
    { key: "variant", label: "Size / colour", render: (r) => [r.size, r.color].filter(Boolean).join(" · ") || "Any", csvValue: (r) => [r.size, r.color].filter(Boolean).join(" ") },
    { key: "email", label: "Email", render: (r) => r.email, csvValue: (r) => r.email },
    { key: "price", label: "Price at sign-up", align: "right", render: (r) => (r.priceAtSignup ? formatNaira(r.priceAtSignup) : "—"), csvValue: (r) => r.priceAtSignup ?? "" },
    { key: "created", label: "Requested", render: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt, csvValue: (r) => r.createdAt },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusPill status={r.notifiedAt ? "sent" : "pending"} label={r.notifiedAt ? `Sent ${formatDate(r.notifiedAt)}` : "Waiting"} />,
      csvValue: (r) => r.notifiedAt ?? "waiting",
    },
    {
      key: "action",
      label: "",
      render: (r) =>
        r.notifiedAt ? null : (
          <button type="button" onClick={() => checkNow(r.productId)} className="text-xs text-brass hover:underline">
            Check now
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Stock alerts" description="Customers waiting for a piece to come back, or for its price to drop. Emails go out automatically when a product changes." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Waiting" value={ready ? waiting.length : "—"} />
        <StatCard label="Sent" value={ready ? rows.length - waiting.length : "—"} />
        <StatCard label="Most requested" value={ready ? (demand ? `${demand[0]} (${demand[1]})` : "—") : "—"} />
      </div>
      <Card>
        <DataTable columns={columns} rows={rows} getRowId={(r) => r.id} loading={!ready} emptyTitle="No alerts yet" emptyDescription="Requests appear here when shoppers tap 'Notify me' on a product." pageSize={20} />
      </Card>
    </div>
  );
}
