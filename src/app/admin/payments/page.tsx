"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/lib/orders-context";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate, formatNaira } from "@/lib/format";
import type { Order } from "@/lib/types";
import type { PaymentProviderConfig } from "@/lib/admin/types";
import { PageHeader, Card, StatCard, StatusPill, Drawer, Tabs } from "@/components/admin/ui/primitives";
import { DataTable, Column, exportCsv } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect, DateRangeFilter, DateRangeKey, rangeFromPreset } from "@/components/admin/ui/FilterBar";
import { SelectField, Toggle } from "@/components/admin/ui/form";
import { inRange } from "@/lib/admin/analytics";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState("transactions");
  return (
    <div>
      <PageHeader title="Payments" description="Transactions across all payment providers." />
      <Tabs tabs={[{ key: "transactions", label: "Transactions" }, { key: "providers", label: "Provider Settings" }]} active={tab} onChange={setTab} />
      <div className="mt-5">{tab === "transactions" ? <Transactions /> : <Providers />}</div>
    </div>
  );
}

function Transactions() {
  const { orders, isReady } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Order["paymentStatus"]>("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("12m");
  const [custom, setCustom] = useState<{ from: string; to: string } | undefined>();
  const range = useMemo(() => rangeFromPreset(rangeKey, custom), [rangeKey, custom]);
  const [openId, setOpenId] = useState<string | null>(null);

  const providers = useMemo(() => Array.from(new Set(orders.map((o) => o.paymentProvider).filter(Boolean))) as string[], [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (q && !(o.id.toLowerCase().includes(q) || o.transactionId?.toLowerCase().includes(q) || o.address.fullName.toLowerCase().includes(q))) return false;
      if (statusFilter !== "all" && o.paymentStatus !== statusFilter) return false;
      if (providerFilter !== "all" && o.paymentProvider !== providerFilter) return false;
      if (!inRange(o.date, range.from, range.to)) return false;
      return true;
    });
  }, [orders, search, statusFilter, providerFilter, range]);

  const kpis = useMemo(
    () => ({
      successful: orders.filter((o) => o.paymentStatus === "paid"),
      pending: orders.filter((o) => o.paymentStatus === "pending"),
      failed: orders.filter((o) => o.paymentStatus === "failed"),
      refunded: orders.filter((o) => o.paymentStatus === "refunded" || o.paymentStatus === "partially_refunded"),
    }),
    [orders]
  );

  const open = orders.find((o) => o.id === openId);

  const columns: Column<Order>[] = [
    { key: "txn", label: "Transaction ID", render: (o) => o.transactionId ?? "—", sortValue: (o) => o.transactionId ?? "", csvValue: (o) => o.transactionId ?? "" },
    { key: "order", label: "Order", render: (o) => o.id, sortValue: (o) => o.id, csvValue: (o) => o.id },
    { key: "customer", label: "Customer", render: (o) => o.address.fullName, sortValue: (o) => o.address.fullName, csvValue: (o) => o.address.fullName },
    { key: "amount", label: "Amount", align: "right", render: (o) => formatNaira(o.total), sortValue: (o) => o.total, csvValue: (o) => o.total },
    { key: "provider", label: "Provider", render: (o) => o.paymentProvider ?? "—", sortValue: (o) => o.paymentProvider ?? "", csvValue: (o) => o.paymentProvider ?? "" },
    { key: "method", label: "Method", render: (o) => (o.paymentMethod === "transfer" ? "Bank Transfer" : "Card"), csvValue: (o) => o.paymentMethod ?? "" },
    { key: "date", label: "Date", render: (o) => formatDate(o.date), sortValue: (o) => o.date, csvValue: (o) => formatDate(o.date) },
    { key: "status", label: "Status", render: (o) => <StatusPill status={o.paymentStatus} />, sortValue: (o) => o.paymentStatus, csvValue: (o) => o.paymentStatus },
  ];

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Successful Payments" value={`${kpis.successful.length} · ${formatNaira(kpis.successful.reduce((s, o) => s + o.total, 0))}`} />
        <StatCard label="Pending Payments" value={kpis.pending.length} />
        <StatCard label="Failed Payments" value={kpis.failed.length} />
        <StatCard label="Refunded Payments" value={kpis.refunded.length} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search transaction, order, customer…" />
        <FilterSelect ariaLabel="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "paid", label: "Successful" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }, { value: "refunded", label: "Refunded" }, { value: "partially_refunded", label: "Partially Refunded" }]} />
        <FilterSelect ariaLabel="Provider" value={providerFilter} onChange={setProviderFilter} options={[{ value: "all", label: "All Providers" }, ...providers.map((p) => ({ value: p, label: p }))]} />
        <DateRangeFilter value={rangeKey} onChange={(k, c) => { setRangeKey(k); setCustom(c); }} />
        <button onClick={() => exportCsv("payments.csv", columns, filtered)} className="border border-line px-3.5 py-2.5 text-xs hover:border-brass">Export CSV</button>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(o) => o.id} loading={!isReady} emptyTitle="No transactions match these filters" pageSize={12} onRowClick={(o) => setOpenId(o.id)} />

      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.transactionId ?? open.id}>
          <Card>
            <div className="space-y-2 text-sm">
              <Row label="Order" value={open.id} />
              <Row label="Customer" value={open.address.fullName} />
              <Row label="Amount" value={formatNaira(open.total)} />
              <Row label="Currency" value="NGN" />
              <Row label="Provider" value={open.paymentProvider ?? "—"} />
              <Row label="Method" value={open.paymentMethod === "transfer" ? "Bank Transfer" : "Card"} />
              <Row label="Date" value={formatDate(open.date)} />
            </div>
          </Card>
          <p className="mt-3 text-xs text-ink/40">Raw card details are never stored or displayed — only provider references.</p>
        </Drawer>
      )}
    </div>
  );
}

function Providers() {
  const { paymentProviders, setPaymentProviders } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();

  async function update(id: string, patch: Partial<PaymentProviderConfig>) {
    const current = paymentProviders.find((provider) => provider.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    try {
      const saved = await apiRequest<Record<string, unknown>>("/admin/payment-providers", {
        method: "PUT",
        body: {
          provider: next.provider.toLowerCase().replaceAll(" ", "_"),
          enabled: next.enabled,
          mode: next.mode,
          currencies: next.currencies,
        },
      });
      setPaymentProviders((prev) => prev.map((provider) => provider.id === id ? {
        ...next,
        ...saved,
        provider: next.provider,
        publicKeyMasked: String(saved.publicKeyMasked ?? next.publicKeyMasked),
        secretKeyMasked: String(saved.secretKeyMasked ?? next.secretKeyMasked),
        webhookUrl: String(saved.webhookUrl ?? next.webhookUrl),
      } : provider));
    } catch (error) {
      toast("Payment provider was not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {paymentProviders.map((p) => (
        <Card key={p.id}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg">{p.provider}</p>
            <StatusPill status={p.enabled ? "active" : "disabled"} />
          </div>
          <div className="space-y-3">
            <Toggle
              label="Enabled"
              checked={p.enabled}
              onChange={(v) => {
                if (!can("settings", "edit")) return;
                update(p.id, { enabled: v });
                audit("payment_provider.toggled", "payments", `${v ? "Enabled" : "Disabled"} ${p.provider}.`, { resourceId: p.id });
              }}
            />
            <SelectField
              label="Mode"
              value={p.mode}
              onChange={(v) => {
                if (!can("settings", "edit")) return;
                update(p.id, { mode: v as "test" | "live" });
                audit("payment_provider.mode_changed", "payments", `Switched ${p.provider} to ${v} mode.`, { resourceId: p.id });
              }}
              options={[{ value: "test", label: "Test" }, { value: "live", label: "Live" }]}
            />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-ink/40">Public Key</p>
                <p className="font-mono text-ink/70">{p.publicKeyMasked}</p>
              </div>
              <div>
                <p className="text-ink/40">Secret Key</p>
                <p className="font-mono text-ink/70">{p.secretKeyMasked}</p>
              </div>
            </div>
            <div className="text-xs">
              <p className="text-ink/40">Webhook URL</p>
              <p className="break-all font-mono text-ink/70">{p.webhookUrl}</p>
              <p className={`mt-1 ${p.webhookConfigured ? "text-[#006300]" : "text-error"}`}>{p.webhookConfigured ? "Configured" : "Not configured"}</p>
            </div>
            <p className="text-xs text-ink/40">Currencies: {p.currencies.join(", ")}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/50">{label}</span>
      <span className="text-ink/85">{value}</span>
    </div>
  );
}
