"use client";

import { useCallback, useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { useOrders } from "@/lib/orders-context";
import { formatDate, formatNaira } from "@/lib/format";
import type { Refund, RefundStatus } from "@/lib/admin/types";
import { PageHeader, Card, StatCard, StatusPill, Drawer, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Field, NumberField, SelectField, TextareaField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

export default function AdminRefundsPage() {
  const { refunds, requestRefund, updateRefundStatus } = useAdminStore();
  const { orders } = useOrders();
  const { currentUser, can } = useAdminAuth();
  const audit = useAudit();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RefundStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

  const orderFor = useCallback((refund: Refund) => orders.find((o) => o.id === refund.orderId), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return refunds.filter((r) => {
      const order = orderFor(r);
      if (q && !(r.orderId.toLowerCase().includes(q) || order?.address.fullName.toLowerCase().includes(q))) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [refunds, search, statusFilter, orderFor]);

  const kpis = useMemo(
    () => ({
      requested: refunds.filter((r) => r.status === "requested").length,
      approved: refunds.filter((r) => r.status === "approved").length,
      processed: refunds.filter((r) => r.status === "processed"),
      rejected: refunds.filter((r) => r.status === "rejected").length,
    }),
    [refunds]
  );

  function process(refund: Refund, next: RefundStatus) {
    updateRefundStatus(refund.id, next, currentUser?.name ?? "Admin");
    audit("refund.status_updated", "refunds", `${next[0].toUpperCase()}${next.slice(1)} refund for ${refund.orderId}.`, { resourceId: refund.id });
    // The refund endpoint is the canonical payment/order transition. Keeping
    // the UI read-only here avoids fabricating a refund state before the
    // provider-facing workflow has completed.
  }

  const open = refunds.find((r) => r.id === openId);
  const openOrder = open ? orderFor(open) : undefined;

  const columns: Column<Refund>[] = [
    { key: "id", label: "Refund", render: (r) => r.id, sortValue: (r) => r.id, csvValue: (r) => r.id },
    { key: "order", label: "Order", render: (r) => r.orderId, sortValue: (r) => r.orderId, csvValue: (r) => r.orderId },
    { key: "customer", label: "Customer", render: (r) => orderFor(r)?.address.fullName ?? "—", csvValue: (r) => orderFor(r)?.address.fullName ?? "" },
    { key: "amount", label: "Amount", align: "right", render: (r) => formatNaira(r.amount), sortValue: (r) => r.amount, csvValue: (r) => r.amount },
    { key: "type", label: "Type", render: (r) => (r.type === "full" ? "Full" : "Partial"), csvValue: (r) => r.type },
    { key: "reason", label: "Reason", render: (r) => <span className="line-clamp-1 max-w-[220px]">{r.reason}</span>, csvValue: (r) => r.reason },
    { key: "status", label: "Status", render: (r) => <StatusPill status={r.status} />, sortValue: (r) => r.status, csvValue: (r) => r.status },
    { key: "date", label: "Requested", render: (r) => formatDate(r.requestedAt), sortValue: (r) => r.requestedAt, csvValue: (r) => formatDate(r.requestedAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Refunds"
        description={`${refunds.length} refund requests`}
        actions={can("refunds", "create") && <Button onClick={() => setRequesting(true)}>New Refund Request</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting Review" value={kpis.requested} />
        <StatCard label="Approved" value={kpis.approved} />
        <StatCard label="Processed" value={`${kpis.processed.length} · ${formatNaira(kpis.processed.reduce((s, r) => s + r.amount, 0))}`} />
        <StatCard label="Rejected" value={kpis.rejected} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search order or customer…" />
        <FilterSelect ariaLabel="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "requested", label: "Requested" }, { value: "approved", label: "Approved" }, { value: "processed", label: "Processed" }, { value: "rejected", label: "Rejected" }]} />
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(r) => r.id} emptyTitle="No refund requests match these filters" pageSize={12} onRowClick={(r) => setOpenId(r.id)} />

      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.id}>
          <div className="mb-4 flex items-center gap-2">
            <StatusPill status={open.status} />
            <span className="text-sm">{open.type === "full" ? "Full refund" : "Partial refund"}</span>
          </div>
          <Card>
            <div className="space-y-2 text-sm">
              <Row label="Order" value={open.orderId} />
              <Row label="Customer" value={openOrder?.address.fullName ?? "—"} />
              <Row label="Order Total" value={openOrder ? formatNaira(openOrder.total) : "—"} />
              <Row label="Refund Amount" value={formatNaira(open.amount)} />
              <Row label="Requested By" value={open.requestedBy} />
              <Row label="Requested" value={formatDate(open.requestedAt)} />
              {open.processedAt && <Row label="Processed" value={formatDate(open.processedAt)} />}
              {open.processedBy && <Row label="Processed By" value={open.processedBy} />}
            </div>
          </Card>
          <Card className="mt-3">
            <p className="eyebrow mb-1.5">Reason</p>
            <p className="text-sm text-ink/70">{open.reason}</p>
            {open.internalNotes && (
              <>
                <p className="eyebrow mb-1.5 mt-3">Internal Notes</p>
                <p className="text-sm text-ink/70">{open.internalNotes}</p>
              </>
            )}
          </Card>

          {can("refunds", "approve") && open.status === "requested" && (
            <div className="mt-4 flex gap-3">
              <Button onClick={() => process(open, "approved")}>Approve</Button>
              <Button variant="secondary" onClick={() => setConfirmReject(open.id)}>Reject</Button>
            </div>
          )}
          {can("refunds", "refund") && open.status === "approved" && (
            <div className="mt-4">
              <Button onClick={() => process(open, "processed")}>Process Refund</Button>
            </div>
          )}
        </Drawer>
      )}

      {requesting && (
        <RequestRefundModal
          orders={orders}
          onCancel={() => setRequesting(false)}
          onSubmit={(orderId, amount, type, reason) => {
            requestRefund({ orderId, amount, type, reason, requestedBy: currentUser?.name ?? "Admin" });
            audit("refund.requested", "refunds", `Requested a ${type} refund for order ${orderId}.`, { resourceId: orderId });
            setRequesting(false);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmReject)}
        onClose={() => setConfirmReject(null)}
        onConfirm={() => {
          const r = refunds.find((x) => x.id === confirmReject);
          if (r) process(r, "rejected");
        }}
        title="Reject this refund request?"
        confirmLabel="Reject Refund"
        danger
      />
    </div>
  );
}

function RequestRefundModal({
  orders,
  onCancel,
  onSubmit,
}: {
  orders: import("@/lib/types").Order[];
  onCancel: () => void;
  onSubmit: (orderId: string, amount: number, type: "full" | "partial", reason: string) => void;
}) {
  const [orderId, setOrderId] = useState("");
  const [type, setType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const order = orders.find((o) => o.id.toLowerCase() === orderId.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md border border-line bg-ivory p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 font-display text-xl">New Refund Request</h2>
        <div className="space-y-4">
          <Field label="Order Number" required value={orderId} onChange={setOrderId} placeholder="e.g. MOM-104213" />
          {orderId && !order && <p className="text-xs text-error">No order found with that number.</p>}
          {order && <p className="text-xs text-ink/50">{order.address.fullName} · {formatNaira(order.total)}</p>}
          <SelectField label="Type" value={type} onChange={(v) => { setType(v); if (v === "full" && order) setAmount(order.total); }} options={[{ value: "full", label: "Full Refund" }, { value: "partial", label: "Partial Refund" }]} />
          <NumberField label="Amount (₦)" value={amount} onChange={setAmount} min={0} />
          <TextareaField label="Reason" value={reason} onChange={setReason} rows={2} />
        </div>
        <div className="mt-6 flex gap-3">
          <Button disabled={!order || amount <= 0 || !reason.trim()} onClick={() => onSubmit(order!.id, amount, type, reason.trim())}>
            Submit Request
          </Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
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
