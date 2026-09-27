"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { useOrders } from "@/lib/orders-context";
import { useMeasurements } from "@/lib/measurement-context";
import { formatDate, formatNaira } from "@/lib/format";
import type { Customer, CustomerStatus } from "@/lib/admin/types";
import { PageHeader, Card, StatCard, StatusPill, Drawer, Tabs, Badge } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { TextareaField } from "@/components/admin/ui/form";

export default function AdminCustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersContent />
    </Suspense>
  );
}

function CustomersContent() {
  const { customers, upsertCustomer, addCustomerNote } = useAdminStore();
  const { orders } = useOrders();
  const { profiles } = useMeasurements();
  const { currentUser, can } = useAdminAuth();
  const audit = useAudit();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerStatus>("all");
  const [openId, setOpenId] = useState<string | null>(searchParams.get("open"));

  const enriched = useMemo(
    () =>
      customers.map((c) => {
        const customerOrders = orders.filter((o) => o.customerEmail === c.email);
        const totalSpent = customerOrders.reduce((s, o) => s + o.total, 0);
        const lastOrder = customerOrders[0];
        return { customer: c, orders: customerOrders, totalSpent, lastOrder };
      }),
    [customers, orders]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ customer }) => {
      if (q && !(customer.name.toLowerCase().includes(q) || customer.email.toLowerCase().includes(q))) return false;
      if (statusFilter !== "all" && customer.status !== statusFilter) return false;
      return true;
    });
  }, [enriched, search, statusFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    return {
      total: customers.length,
      vip: customers.filter((c) => c.status === "vip").length,
      newThisMonth: customers.filter((c) => {
        const d = new Date(c.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      returning: enriched.filter((e) => e.orders.length > 1).length,
    };
  }, [customers, enriched]);

  const openEntry = enriched.find((e) => e.customer.id === openId);

  const columns: Column<(typeof enriched)[number]>[] = [
    { key: "name", label: "Customer", render: (e) => <div><p className="font-medium">{e.customer.name}</p><p className="text-xs text-ink/40">{e.customer.email}</p></div>, sortValue: (e) => e.customer.name, csvValue: (e) => e.customer.name },
    { key: "status", label: "Status", render: (e) => <StatusPill status={e.customer.status} />, sortValue: (e) => e.customer.status, csvValue: (e) => e.customer.status },
    { key: "orders", label: "Orders", align: "right", render: (e) => e.orders.length, sortValue: (e) => e.orders.length, csvValue: (e) => e.orders.length },
    { key: "spent", label: "Total Spent", align: "right", render: (e) => formatNaira(e.totalSpent), sortValue: (e) => e.totalSpent, csvValue: (e) => e.totalSpent },
    { key: "last", label: "Last Order", render: (e) => (e.lastOrder ? formatDate(e.lastOrder.date) : "—"), sortValue: (e) => e.lastOrder?.date ?? "", csvValue: (e) => (e.lastOrder ? formatDate(e.lastOrder.date) : "—") },
    { key: "created", label: "Customer Since", render: (e) => formatDate(e.customer.createdAt), sortValue: (e) => e.customer.createdAt, csvValue: (e) => formatDate(e.customer.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Customers" description={`${customers.length} customers`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Customers" value={kpis.total} />
        <StatCard label="VIP Customers" value={kpis.vip} />
        <StatCard label="New This Month" value={kpis.newThisMonth} />
        <StatCard label="Returning Customers" value={kpis.returning} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email…" />
        <FilterSelect ariaLabel="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "active", label: "Active" }, { value: "vip", label: "VIP" }, { value: "disabled", label: "Disabled" }]} />
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(e) => e.customer.id} emptyTitle="No customers match these filters" pageSize={12} onRowClick={(e) => setOpenId(e.customer.id)} />

      {openEntry && (
        <CustomerDrawer
          entry={openEntry}
          measurementProfiles={profiles}
          onClose={() => setOpenId(null)}
          canEdit={can("customers", "edit")}
          onToggleDisabled={() => {
            const nextStatus: CustomerStatus = openEntry.customer.status === "disabled" ? "active" : "disabled";
            upsertCustomer({ ...openEntry.customer, status: nextStatus });
            audit("customer.status_changed", "customers", `${nextStatus === "disabled" ? "Disabled" : "Re-enabled"} customer "${openEntry.customer.name}".`, { resourceId: openEntry.customer.id });
          }}
          onAddNote={(msg) => {
            addCustomerNote(openEntry.customer.id, currentUser?.name ?? "Admin", msg);
            audit("customer.note_added", "customers", `Added an internal note to "${openEntry.customer.name}".`, { resourceId: openEntry.customer.id });
          }}
        />
      )}
    </div>
  );
}

function CustomerDrawer({
  entry,
  measurementProfiles,
  onClose,
  canEdit,
  onToggleDisabled,
  onAddNote,
}: {
  entry: { customer: Customer; orders: import("@/lib/types").Order[]; totalSpent: number };
  measurementProfiles: import("@/lib/types").MeasurementProfile[];
  onClose: () => void;
  canEdit: boolean;
  onToggleDisabled: () => void;
  onAddNote: (msg: string) => void;
}) {
  const { customer, orders, totalSpent } = entry;
  const [tab, setTab] = useState("overview");
  const [noteDraft, setNoteDraft] = useState("");
  const linkedProfiles = measurementProfiles.filter((p) => p.customerId === customer.id);

  return (
    <Drawer open onClose={onClose} title={customer.name} wide>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={customer.status} />
        {customer.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
        {canEdit && (
          <button onClick={onToggleDisabled} className="ml-auto border border-line px-2.5 py-1.5 text-xs hover:border-brass">
            {customer.status === "disabled" ? "Re-enable Account" : "Disable Account"}
          </button>
        )}
      </div>

      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "orders", label: "Orders", count: orders.length },
          { key: "measurements", label: "Measurements", count: linkedProfiles.length },
          { key: "addresses", label: "Addresses", count: customer.addresses.length },
          { key: "notes", label: "Notes", count: customer.notes.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5 space-y-4">
        {tab === "overview" && (
          <>
            <Card>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Row label="Email" value={customer.email} />
                <Row label="Phone" value={customer.phone ?? "—"} />
                <Row label="Customer Since" value={formatDate(customer.createdAt)} />
                <Row label="Marketing Opt-in" value={customer.marketingOptIn ? "Yes" : "No"} />
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Orders" value={orders.length} />
              <StatCard label="Total Spent" value={formatNaira(totalSpent)} />
            </div>
          </>
        )}

        {tab === "orders" &&
          (orders.length === 0 ? (
            <p className="text-sm text-ink/45">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between border-b border-line pb-2 text-sm">
                  <div>
                    <p className="font-medium">{o.id}</p>
                    <p className="text-xs text-ink/45">{formatDate(o.date)}</p>
                  </div>
                  <div className="text-right">
                    <StatusPill status={o.status ?? "Order Placed"} />
                    <p className="mt-1 text-xs text-ink/50">{formatNaira(o.total)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === "measurements" &&
          (linkedProfiles.length === 0 ? (
            <p className="text-sm text-ink/45">No measurement profiles linked to this customer account yet.</p>
          ) : (
            linkedProfiles.map((p) => (
              <Card key={p.id}>
                <p className="font-medium">{p.label}</p>
                <p className="mb-2 text-xs text-ink/40">Updated {formatDate(p.updatedAt)} · Unit: {p.unit}</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-ink/60">
                  {Object.entries(p.values).map(([k, v]) => (
                    <span key={k}>{k}: {v}</span>
                  ))}
                </div>
              </Card>
            ))
          ))}

        {tab === "addresses" &&
          (customer.addresses.length === 0 ? (
            <p className="text-sm text-ink/45">No saved addresses.</p>
          ) : (
            customer.addresses.map((a, i) => (
              <Card key={i}>
                <p className="text-sm">{a.fullName}</p>
                <p className="text-xs text-ink/50">{a.address}, {a.city}, {a.state}, {a.country} {a.postalCode}</p>
                <p className="text-xs text-ink/40">{a.phone}</p>
              </Card>
            ))
          ))}

        {tab === "notes" && (
          <>
            {canEdit && (
              <Card>
                <TextareaField label="Add internal note" value={noteDraft} onChange={setNoteDraft} rows={2} />
                <button
                  onClick={() => {
                    if (noteDraft.trim()) {
                      onAddNote(noteDraft.trim());
                      setNoteDraft("");
                    }
                  }}
                  className="mt-2.5 border border-line px-3 py-1.5 text-xs hover:border-brass"
                >
                  Add Note
                </button>
              </Card>
            )}
            <ul className="space-y-3">
              {customer.notes.map((n) => (
                <li key={n.id} className="border-b border-line pb-2.5 text-sm">
                  <p>{n.message}</p>
                  <p className="mt-1 text-xs text-ink/40">{n.author} · {formatDate(n.date)}</p>
                </li>
              ))}
              {customer.notes.length === 0 && <p className="text-sm text-ink/45">No notes yet.</p>}
            </ul>
          </>
        )}
      </div>
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink/40">{label}</p>
      <p>{value}</p>
    </div>
  );
}
