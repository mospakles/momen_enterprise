"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useOrders, ORDER_STAGES } from "@/lib/orders-context";
import { orderType, OrderTypeLabel } from "@/lib/order-stages";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate, formatNaira } from "@/lib/format";
import type { CustomizationApprovalStatus, Fabric, Order, OrderStatus } from "@/lib/types";
import { PageHeader, Card, StatusPill, Drawer, ConfirmDialog, Tabs, Badge, BulkToolbar } from "@/components/admin/ui/primitives";
import { DataTable, Column, exportCsv } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect, DateRangeFilter, DateRangeKey, rangeFromPreset } from "@/components/admin/ui/FilterBar";
import { TextareaField } from "@/components/admin/ui/form";
import { inRange } from "@/lib/admin/analytics";
import { isMadeToMeasure } from "@/lib/product-utils";

const EXCEPTION_STATUSES: OrderStatus[] = ["Payment Failed", "Cancelled", "Refund Requested", "Refunded", "Partially Refunded", "On Hold", "Awaiting Customer Response"];
const ALL_STATUSES: OrderStatus[] = [...ORDER_STAGES, ...EXCEPTION_STATUSES];

/** The Custom Order Approval Workflow (Section 9): the actions available
 * next depend on where the order currently sits, so the drawer only ever
 * offers moves that make sense from the current state. `notePrompt` gates
 * whether the action requires the clarification/rejection note field to be
 * filled in before it can fire. */
const CUSTOMIZATION_ACTIONS: Record<CustomizationApprovalStatus, { label: string; next: CustomizationApprovalStatus; notePrompt?: boolean; danger?: boolean }[]> = {
  not_applicable: [],
  submitted: [{ label: "Begin Review", next: "under_review" }],
  under_review: [
    { label: "Approve", next: "approved" },
    { label: "Request Clarification", next: "clarification_requested", notePrompt: true },
    { label: "Request New Measurements", next: "clarification_requested", notePrompt: true },
    { label: "Reject", next: "rejected", notePrompt: true, danger: true },
  ],
  approved: [
    { label: "Send to Customer for Confirmation", next: "awaiting_customer_confirmation" },
    { label: "Reject", next: "rejected", notePrompt: true, danger: true },
  ],
  awaiting_customer_confirmation: [
    { label: "Mark Confirmed (on customer's behalf)", next: "confirmed" },
    { label: "Reject", next: "rejected", notePrompt: true, danger: true },
  ],
  clarification_requested: [
    { label: "Back to Under Review", next: "under_review" },
    { label: "Reject", next: "rejected", notePrompt: true, danger: true },
  ],
  confirmed: [],
  rejected: [{ label: "Reopen for Review", next: "under_review" }],
};

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const { orders, isReady, updateOrderStatus, addInternalNote, addCustomerNote, cancelOrder, duplicateOrder, updateCustomizationStatus } = useOrders();
  const { productionStaff, fabrics } = useAdminStore();
  const { currentUser, can } = useAdminAuth();
  const audit = useAudit();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | Order["paymentStatus"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [speedFilter, setSpeedFilter] = useState<"all" | "standard" | "express">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | OrderTypeLabel>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("12m");
  const [custom, setCustom] = useState<{ from: string; to: string } | undefined>();
  const range = useMemo(() => rangeFromPreset(rangeKey, custom), [rangeKey, custom]);

  const [openId, setOpenId] = useState<string | null>(searchParams.get("open"));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const countries = useMemo(() => Array.from(new Set(orders.map((o) => o.address.country))).sort(), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (q && !(o.id.toLowerCase().includes(q) || o.address.fullName.toLowerCase().includes(q) || o.customerEmail?.toLowerCase().includes(q))) return false;
      if (paymentFilter !== "all" && o.paymentStatus !== paymentFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (speedFilter !== "all" && o.productionSpeed !== speedFilter) return false;
      if (typeFilter !== "all" && orderType(o.items) !== typeFilter) return false;
      if (countryFilter !== "all" && o.address.country !== countryFilter) return false;
      if (!inRange(o.date, range.from, range.to)) return false;
      return true;
    });
  }, [orders, search, paymentFilter, statusFilter, speedFilter, typeFilter, countryFilter, range]);

  const openOrder = orders.find((o) => o.id === openId) ?? null;

  const columns: Column<Order>[] = [
    { key: "id", label: "Order", render: (o) => <span className="font-medium">{o.id}</span>, sortValue: (o) => o.id, csvValue: (o) => o.id },
    { key: "date", label: "Date", render: (o) => formatDate(o.date), sortValue: (o) => o.date, csvValue: (o) => formatDate(o.date) },
    { key: "customer", label: "Customer", render: (o) => o.address.fullName, sortValue: (o) => o.address.fullName, csvValue: (o) => o.address.fullName },
    { key: "country", label: "Country", render: (o) => o.address.country, sortValue: (o) => o.address.country, csvValue: (o) => o.address.country },
    { key: "type", label: "Type", render: (o) => <Badge tone={orderType(o.items) === "Custom" ? "brass" : "neutral"}>{orderType(o.items)}</Badge>, sortValue: (o) => orderType(o.items), csvValue: (o) => orderType(o.items) },
    { key: "status", label: "Status", render: (o) => <StatusPill status={o.status ?? "Order Placed"} />, sortValue: (o) => o.status ?? "", csvValue: (o) => o.status ?? "" },
    { key: "payment", label: "Payment", render: (o) => <StatusPill status={o.paymentStatus} />, sortValue: (o) => o.paymentStatus, csvValue: (o) => o.paymentStatus },
    { key: "speed", label: "Speed", render: (o) => (o.productionSpeed === "express" ? <Badge tone="brass">Express</Badge> : <Badge>Standard</Badge>), sortValue: (o) => o.productionSpeed, csvValue: (o) => o.productionSpeed },
    { key: "total", label: "Total", align: "right", render: (o) => formatNaira(o.total), sortValue: (o) => o.total, csvValue: (o) => o.total },
  ];

  function handleBulkStatus(status: OrderStatus) {
    selected.forEach((id) => updateOrderStatus(id, status, currentUser?.name ?? "Admin"));
    audit("order.bulk_status_update", "orders", `Bulk-updated ${selected.size} order(s) to ${status}.`, {});
    setSelected(new Set());
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${orders.length} total orders`}
        actions={
          <>
            <DateRangeFilter value={rangeKey} onChange={(k, c) => { setRangeKey(k); setCustom(c); }} />
            <button onClick={() => exportCsv("orders.csv", columns, filtered)} className="border border-line px-3.5 py-2.5 text-xs hover:border-brass">
              Export CSV
            </button>
          </>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search order #, customer, email…" />
        <FilterSelect ariaLabel="Payment status" value={paymentFilter} onChange={setPaymentFilter} options={[{ value: "all", label: "All Payments" }, { value: "paid", label: "Paid" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }, { value: "refunded", label: "Refunded" }, { value: "partially_refunded", label: "Partially Refunded" }]} />
        <FilterSelect ariaLabel="Order status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, ...ALL_STATUSES.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect ariaLabel="Production speed" value={speedFilter} onChange={setSpeedFilter} options={[{ value: "all", label: "Standard & Express" }, { value: "standard", label: "Standard" }, { value: "express", label: "Express" }]} />
        <FilterSelect
          ariaLabel="Order type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: "all", label: "All Order Types" }, { value: "Ready-to-Wear", label: "Ready-to-Wear" }, { value: "Made-to-Measure", label: "Made-to-Measure" }, { value: "Custom", label: "Custom" }, { value: "Accessory", label: "Accessory" }]}
        />
        <FilterSelect ariaLabel="Country" value={countryFilter} onChange={setCountryFilter} options={[{ value: "all", label: "All Countries" }, ...countries.map((c) => ({ value: c, label: c }))]} />
      </FilterBar>

      {can("orders", "edit") && (
        <BulkToolbar count={selected.size} onClear={() => setSelected(new Set())}>
          <button onClick={() => handleBulkStatus("Production Queue")} className="border border-line px-2.5 py-1 text-xs hover:border-brass">
            Move to Production Queue
          </button>
          <button onClick={() => handleBulkStatus("Shipped")} className="border border-line px-2.5 py-1 text-xs hover:border-brass">
            Mark Shipped
          </button>
          <button onClick={() => handleBulkStatus("Delivered")} className="border border-line px-2.5 py-1 text-xs hover:border-brass">
            Mark Delivered
          </button>
        </BulkToolbar>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(o) => o.id}
        loading={!isReady}
        emptyTitle="No orders match these filters"
        pageSize={12}
        selectable={can("orders", "edit")}
        selectedIds={selected}
        onSelectChange={setSelected}
        onRowClick={(o) => setOpenId(o.id)}
      />

      {openOrder && (
        <OrderDrawer
          order={openOrder}
          onClose={() => setOpenId(null)}
          staff={productionStaff}
          fabrics={fabrics}
          onUpdateCustomizationStatus={(status, note) => {
            updateCustomizationStatus(openOrder.id, status, currentUser?.name ?? "Admin", note);
            audit("order.customization_review", "orders", `Set customization review on ${openOrder.id} to ${status}.`, { resourceId: openOrder.id, before: openOrder.customizationStatus, after: status });
          }}
          onUpdateStatus={(status) => {
            updateOrderStatus(openOrder.id, status, currentUser?.name ?? "Admin");
            audit("order.status_updated", "orders", `Changed ${openOrder.id} status to ${status}.`, { resourceId: openOrder.id, before: openOrder.status, after: status });
          }}
          onInternalNote={(msg) => {
            addInternalNote(openOrder.id, currentUser?.name ?? "Admin", msg);
            audit("order.internal_note", "orders", `Added internal note to ${openOrder.id}.`, { resourceId: openOrder.id });
          }}
          onCustomerNote={(msg) => {
            addCustomerNote(openOrder.id, currentUser?.name ?? "Admin", msg);
            audit("order.customer_note", "orders", `Sent customer note on ${openOrder.id}.`, { resourceId: openOrder.id });
          }}
          onDuplicate={async () => {
            const id = await duplicateOrder(openOrder.id);
            audit("order.duplicated", "orders", `Duplicated ${openOrder.id} as ${id}.`, { resourceId: openOrder.id });
          }}
          onCancel={() => setConfirmCancel(openOrder.id)}
          canEdit={can("orders", "edit")}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmCancel)}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => {
          if (confirmCancel) {
            cancelOrder(confirmCancel, "Cancelled by admin", currentUser?.name ?? "Admin");
            audit("order.cancelled", "orders", `Cancelled order ${confirmCancel}.`, { resourceId: confirmCancel });
          }
        }}
        title="Cancel this order?"
        description="The customer will be notified automatically. This cannot be undone from here."
        confirmLabel="Cancel Order"
        danger
      />
    </div>
  );
}

function OrderDrawer({
  order,
  onClose,
  staff,
  fabrics,
  onUpdateStatus,
  onInternalNote,
  onCustomerNote,
  onDuplicate,
  onCancel,
  onUpdateCustomizationStatus,
  canEdit,
}: {
  order: Order;
  onClose: () => void;
  staff: { id: string; name: string; role: string }[];
  fabrics: Fabric[];
  onUpdateStatus: (s: OrderStatus) => void;
  onInternalNote: (msg: string) => void;
  onCustomerNote: (msg: string) => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onUpdateCustomizationStatus: (status: CustomizationApprovalStatus, note?: string) => void;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState("details");
  const [noteDraft, setNoteDraft] = useState("");
  const [customerNoteDraft, setCustomerNoteDraft] = useState("");
  const [clarificationDraft, setClarificationDraft] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const assignedStaff = staff.find((s) => s.id === order.production?.assignedStaffId);
  const hasCustomOrder = order.items.some((i) => i.customOrder && (i.customOrder.referenceImages?.length || i.customOrder.specialInstructions || i.customOrder.fabricId));

  return (
    <Drawer open onClose={onClose} title={order.id} wide>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={order.status ?? "Order Placed"} />
        <StatusPill status={order.paymentStatus} />
        {order.productionSpeed === "express" && <Badge tone="brass">Express</Badge>}
        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          {hasCustomOrder && (
            <button onClick={() => setShowBrief(true)} className="border border-brass/50 px-2.5 py-1.5 text-brass hover:bg-brass/5">
              Production Brief
            </button>
          )}
          <button onClick={() => setShowInvoice(true)} className="border border-line px-2.5 py-1.5 hover:border-brass">
            Invoice
          </button>
          <button onClick={() => window.print()} className="border border-line px-2.5 py-1.5 hover:border-brass">
            Print
          </button>
          {canEdit && (
            <button onClick={onDuplicate} className="border border-line px-2.5 py-1.5 hover:border-brass">
              Duplicate
            </button>
          )}
          {canEdit && order.status !== "Cancelled" && (
            <button onClick={onCancel} className="border border-error/40 px-2.5 py-1.5 text-error hover:bg-error/5">
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "details", label: "Details" },
          { key: "timeline", label: "Timeline" },
          ...(hasCustomOrder ? [{ key: "customization", label: "Customization" }] : []),
          { key: "notes", label: "Notes", count: (order.internalNotes?.length ?? 0) + (order.customerNotes?.length ?? 0) },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5 space-y-5">
        {tab === "details" && (
          <>
            <Card>
              <p className="eyebrow mb-2">Customer</p>
              <p className="text-sm">{order.address.fullName}</p>
              <p className="text-sm text-ink/60">{order.customerEmail}</p>
              <p className="text-sm text-ink/60">{order.address.phone}</p>
              <p className="mt-2 text-sm text-ink/60">
                {order.address.address}
                {order.address.apartment ? `, ${order.address.apartment}` : ""}, {order.address.city}, {order.address.state}, {order.address.country}{" "}
                {order.address.postalCode}
              </p>
            </Card>

            <Card>
              <p className="eyebrow mb-3">Items</p>
              <div className="space-y-3">
                {order.items.map((it) => (
                  <div key={it.id} className="flex justify-between gap-3 text-sm">
                    <div>
                      <p>{it.product.name} × {it.quantity}</p>
                      <p className="text-xs text-ink/45">
                        {it.size}, {it.color}
                        {isMadeToMeasure(it.product) && (it.measurement && it.measurement.mode !== "pending" ? " · measurements attached" : it.size === "Made-to-Measure" ? " · measurements pending" : " · standard size from the size guide")}
                        {it.customOrder && " · custom order"}
                      </p>
                    </div>
                    <p>{formatNaira((it.product.price + (it.customizationCost ?? 0)) * it.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                <Row label="Subtotal" value={formatNaira(order.subtotal)} />
                <Row label="Delivery Fee" value={formatNaira(order.deliveryFee)} />
                {order.expressFee > 0 && <Row label="Express Fee" value={formatNaira(order.expressFee)} />}
                {order.discount > 0 && <Row label="Discount" value={`−${formatNaira(order.discount)}${order.couponCode ? ` (${order.couponCode})` : ""}`} />}
                <div className="flex justify-between border-t border-line pt-1.5 font-medium">
                  <span>Total</span>
                  <span>{formatNaira(order.total)}</span>
                </div>
              </div>
            </Card>

            <Card>
              <p className="eyebrow mb-2">Payment</p>
              <Row label="Method" value={order.paymentMethod === "transfer" ? "Bank Transfer" : "Card"} />
              <Row label="Provider" value={order.paymentProvider ?? "—"} />
              <Row label="Transaction ID" value={order.transactionId ?? "—"} />
            </Card>

            <Card>
              <p className="eyebrow mb-2">Production</p>
              <Row label="Assigned Staff" value={assignedStaff ? `${assignedStaff.name} (${assignedStaff.role})` : "Unassigned"} />
              <Row label="Expected Completion" value={order.production?.expectedCompletionDate ? formatDate(order.production.expectedCompletionDate) : "—"} />
              <Row label="Actual Completion" value={order.production?.actualCompletionDate ? formatDate(order.production.actualCompletionDate) : "—"} />
              <p className="mt-2 text-xs text-ink/45">Manage staff assignment and priority from the Production board.</p>
            </Card>

            {canEdit && (
              <Card>
                <p className="eyebrow mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {[...ORDER_STAGES, ...EXCEPTION_STATUSES].map((s) => (
                    <button
                      key={s}
                      onClick={() => onUpdateStatus(s)}
                      className={`border px-2.5 py-1.5 text-xs ${order.status === s ? "border-brass bg-brass/10 text-brass" : "border-line hover:border-brass"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {tab === "customization" && (
          <div className="space-y-5">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Review Status</p>
                <StatusPill status={order.customizationStatus ?? "not_applicable"} label={(order.customizationStatus ?? "not_applicable").replace(/_/g, " ")} />
              </div>
              <p className="text-xs text-ink/50">
                This order includes a customer-submitted custom order (reference images and/or special instructions) that
                goes beyond the standard configured options — review before production begins. If clarification is
                needed, the customer is notified automatically.
              </p>
              {canEdit && (
                <div className="mt-3">
                  <TextareaField label="Note (required for Request Clarification, Request New Measurements, and Reject)" value={clarificationDraft} onChange={setClarificationDraft} rows={2} />
                </div>
              )}
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {CUSTOMIZATION_ACTIONS[order.customizationStatus ?? "not_applicable"].map((action) => (
                    <button
                      key={action.label}
                      disabled={action.notePrompt && !clarificationDraft.trim()}
                      onClick={() => {
                        onUpdateCustomizationStatus(action.next, action.notePrompt ? clarificationDraft.trim() : undefined);
                        setClarificationDraft("");
                      }}
                      className={`border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                        action.danger ? "border-error/40 text-error hover:bg-error/5" : "border-line hover:border-brass"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                  {CUSTOMIZATION_ACTIONS[order.customizationStatus ?? "not_applicable"].length === 0 && (
                    <p className="text-xs text-ink/40">No further review action needed at this stage.</p>
                  )}
                </div>
              )}
            </Card>

            {order.items.filter((it) => it.customOrder).map((it) => {
              const fabric = fabrics.find((f) => f.id === it.customOrder?.fabricId);
              return (
                <Card key={it.id}>
                  <p className="eyebrow mb-2">{it.product.name}</p>
                  <div className="grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
                    <p>Fabric: {fabric?.name ?? "—"}</p>
                    <p>Primary Colour: {it.customOrder?.primaryColor ?? "—"}</p>
                    {it.customOrder?.secondaryColor && <p>Secondary Colour: {it.customOrder.secondaryColor}</p>}
                    {it.customOrder?.contrastColor && <p>Contrast Colour: {it.customOrder.contrastColor}</p>}
                  </div>

                  {it.customOrder?.referenceImages && it.customOrder.referenceImages.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs text-ink/50">Reference Images</p>
                      <div className="flex flex-wrap gap-2">
                        {it.customOrder.referenceImages.map((src, i) => (
                          <div key={i} className="relative h-16 w-16 overflow-hidden bg-ivory-deep">
                            <Image src={src} alt={`Reference ${i + 1}`} fill className="object-cover" unoptimized />
                          </div>
                        ))}
                      </div>
                      {it.customOrder.referenceNotes && <p className="mt-2 text-xs text-ink/60">&ldquo;{it.customOrder.referenceNotes}&rdquo;</p>}
                    </div>
                  )}

                  {it.customOrder?.specialInstructions && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-ink/50">Special Instructions</p>
                      <p className="text-sm text-ink/70">{it.customOrder.specialInstructions}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {tab === "timeline" && (
          <Card>
            <ul className="space-y-3">
              {order.timeline.map((t) => (
                <li key={t.stage} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${t.complete ? "border-brass bg-brass text-ivory" : "border-line text-ink/30"}`}>
                    {t.complete ? "✓" : ""}
                  </span>
                  <div>
                    <p className={t.complete ? "text-ink" : "text-ink/40"}>{t.stage}</p>
                    <p className="text-xs text-ink/40">{formatDate(t.date)}{t.message ? ` · ${t.message}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === "notes" && (
          <div className="space-y-5">
            <Card>
              <p className="eyebrow mb-2">Internal Notes</p>
              <p className="mb-3 text-[11px] text-ink/40">Visible to admin staff only.</p>
              {canEdit && (
                <div className="mb-3 flex gap-2">
                  <TextareaField label="" value={noteDraft} onChange={setNoteDraft} rows={2} />
                </div>
              )}
              {canEdit && (
                <button
                  onClick={() => {
                    if (noteDraft.trim()) {
                      onInternalNote(noteDraft.trim());
                      setNoteDraft("");
                    }
                  }}
                  className="mb-4 border border-line px-3 py-1.5 text-xs hover:border-brass"
                >
                  Add Note
                </button>
              )}
              <ul className="space-y-3">
                {(order.internalNotes ?? []).map((n) => (
                  <li key={n.id} className="border-t border-line pt-2.5 text-sm">
                    <p>{n.message}</p>
                    <p className="mt-1 text-xs text-ink/40">{n.author} · {formatDate(n.date)}</p>
                  </li>
                ))}
                {(order.internalNotes ?? []).length === 0 && <p className="text-sm text-ink/40">No internal notes yet.</p>}
              </ul>
            </Card>

            <Card>
              <p className="eyebrow mb-2">Customer-Facing Notes</p>
              <p className="mb-3 text-[11px] text-ink/40">Shown to the customer on their order tracking page.</p>
              {canEdit && (
                <div className="mb-3 flex gap-2">
                  <TextareaField label="" value={customerNoteDraft} onChange={setCustomerNoteDraft} rows={2} />
                </div>
              )}
              {canEdit && (
                <button
                  onClick={() => {
                    if (customerNoteDraft.trim()) {
                      onCustomerNote(customerNoteDraft.trim());
                      setCustomerNoteDraft("");
                    }
                  }}
                  className="mb-4 border border-line px-3 py-1.5 text-xs hover:border-brass"
                >
                  Send to Customer
                </button>
              )}
              <ul className="space-y-3">
                {(order.customerNotes ?? []).map((n) => (
                  <li key={n.id} className="border-t border-line pt-2.5 text-sm">
                    <p>{n.message}</p>
                    <p className="mt-1 text-xs text-ink/40">{n.author} · {formatDate(n.date)}</p>
                  </li>
                ))}
                {(order.customerNotes ?? []).length === 0 && <p className="text-sm text-ink/40">No customer notes yet.</p>}
              </ul>
            </Card>
          </div>
        )}
      </div>

      {showInvoice && <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />}
      {showBrief && <ProductionBriefModal order={order} fabrics={fabrics} staff={staff} onClose={() => setShowBrief(false)} />}
    </Drawer>
  );
}

function InvoiceModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto bg-ivory p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-display text-xl">Momen</p>
            <p className="text-xs text-ink/50">Invoice — {order.id}</p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">✕</button>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="eyebrow mb-1">Bill To</p>
            <p>{order.address.fullName}</p>
            <p className="text-ink/60">{order.address.address}, {order.address.city}, {order.address.country}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow mb-1">Date</p>
            <p>{formatDate(order.date)}</p>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink/40">
              <th className="py-2 font-normal">Item</th>
              <th className="py-2 text-right font-normal">Qty</th>
              <th className="py-2 text-right font-normal">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-line">
                <td className="py-2">{it.product.name} ({it.size}, {it.color})</td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right">{formatNaira(it.product.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto max-w-[220px] space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatNaira(order.subtotal)} />
          <Row label="Delivery" value={formatNaira(order.deliveryFee)} />
          {order.expressFee > 0 && <Row label="Express" value={formatNaira(order.expressFee)} />}
          {order.discount > 0 && <Row label="Discount" value={`−${formatNaira(order.discount)}`} />}
          <div className="flex justify-between border-t border-line pt-1.5 font-medium">
            <span>Total</span>
            <span>{formatNaira(order.total)}</span>
          </div>
        </div>
        <button onClick={() => window.print()} className="mt-6 w-full bg-ink py-2.5 text-sm text-ivory hover:bg-brass">
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}

/** Consolidated, printable brief for a custom/made-to-measure order —
 * everything production staff need in one place, rather than hunting across
 * tabs (Section 20). Reachable from the order drawer and, for the same
 * order, from the Production board. */
function ProductionBriefModal({
  order,
  fabrics,
  staff,
  onClose,
}: {
  order: Order;
  fabrics: Fabric[];
  staff: { id: string; name: string; role: string }[];
  onClose: () => void;
}) {
  const { measurementFieldDefs } = useAdminStore();
  const assignedStaff = staff.find((s) => s.id === order.production?.assignedStaffId);
  const customItems = order.items.filter((it) => it.customOrder || it.measurement);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto bg-ivory p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-display text-xl">Production Brief</p>
            <p className="text-xs text-ink/50">{order.id} · {orderType(order.items)} · {order.productionSpeed === "express" ? "Express" : "Standard"}</p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">✕</button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="eyebrow mb-1">Customer</p>
            <p>{order.address.fullName}</p>
            <p className="text-ink/60">{order.customerEmail}</p>
            <p className="text-ink/60">{order.address.phone}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow mb-1">Deadline</p>
            <p>{order.production?.expectedCompletionDate ? formatDate(order.production.expectedCompletionDate) : "—"}</p>
            <p className="mt-2 eyebrow mb-1">Assigned To</p>
            <p className="text-ink/60">{assignedStaff ? `${assignedStaff.name} (${assignedStaff.role})` : "Unassigned"}</p>
          </div>
        </div>

        <div className="space-y-6">
          {customItems.map((it) => {
            const fabric = fabrics.find((f) => f.id === it.customOrder?.fabricId);
            const activeFields = (it.product.measurementFieldKeys?.length ? it.product.measurementFieldKeys : undefined) ?? measurementFieldDefs.filter((d) => d.garments.includes(it.product.garment)).map((d) => d.key);
            return (
              <div key={it.id} className="border border-line p-4">
                <p className="font-medium">{it.product.name} × {it.quantity}</p>
                <p className="mb-3 text-xs text-ink/45">{it.size !== "Made-to-Measure" ? `Size ${it.size} · ` : ""}SKU {it.product.sku}</p>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Row label="Fabric" value={fabric?.name ?? it.product.fabric ?? "—"} />
                  <Row label="Primary Colour" value={it.customOrder?.primaryColor ?? it.color} />
                  {it.customOrder?.secondaryColor && <Row label="Secondary Colour" value={it.customOrder.secondaryColor} />}
                  {it.customOrder?.contrastColor && <Row label="Contrast Colour" value={it.customOrder.contrastColor} />}
                </div>

                {it.measurement && it.measurement.mode !== "pending" && it.measurement.values && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs text-ink/50">Measurements ({it.measurement.unit})</p>
                    <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
                      {activeFields.map((key) => {
                        const value = it.measurement?.values?.[key];
                        if (value === undefined) return null;
                        const label = measurementFieldDefs.find((d) => d.key === key)?.label ?? key;
                        return (
                          <div key={key} className="border border-line px-2 py-1.5">
                            <p className="text-ink/40">{label}</p>
                            <p className="font-medium">{value} {it.measurement?.unit}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {it.customOrder?.referenceImages && it.customOrder.referenceImages.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs text-ink/50">Reference Images</p>
                    <div className="flex flex-wrap gap-2">
                      {it.customOrder.referenceImages.map((src, i) => (
                        <div key={i} className="relative h-20 w-20 overflow-hidden bg-ivory-deep">
                          <Image src={src} alt={`Reference ${i + 1}`} fill className="object-cover" unoptimized />
                        </div>
                      ))}
                    </div>
                    {it.customOrder.referenceNotes && <p className="mt-2 text-xs text-ink/60">What to take from this reference: &ldquo;{it.customOrder.referenceNotes}&rdquo;</p>}
                  </div>
                )}

                {it.customOrder?.specialInstructions && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-ink/50">Customer Instructions</p>
                    <p className="text-sm text-ink/70">{it.customOrder.specialInstructions}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(order.internalNotes ?? []).length > 0 && (
          <div className="mt-6">
            <p className="eyebrow mb-2">Internal Notes</p>
            <ul className="space-y-2 text-sm text-ink/70">
              {(order.internalNotes ?? []).map((n) => (
                <li key={n.id}>&ldquo;{n.message}&rdquo; — {n.author}, {formatDate(n.date)}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={() => window.print()} className="mt-6 w-full bg-ink py-2.5 text-sm text-ivory hover:bg-brass">
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/50">{label}</span>
      <span className="text-ink/80">{value}</span>
    </div>
  );
}
