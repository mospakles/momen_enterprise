"use client";

import { useState } from "react";
import { useOrders } from "@/lib/orders-context";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import type { Order, OrderStage } from "@/lib/types";
import type { ProductionStaff, ProductionTimelineRule } from "@/lib/admin/types";
import { PageHeader, Card, StatCard, Badge, Tabs, Drawer, StatusPill } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, NumberField, SelectField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";

const BOARD_STAGES: OrderStage[] = ["Awaiting Measurements", "Production Queue", "In Production", "Quality Check", "Ready for Dispatch"];

function isOverdue(order: Order) {
  if (!order.production?.expectedCompletionDate) return false;
  if (order.status === "Delivered" || order.status === "Cancelled" || order.status === "Shipped") return false;
  return new Date(order.production.expectedCompletionDate) < new Date();
}

export default function AdminProductionPage() {
  const [tab, setTab] = useState("board");
  const { orders } = useOrders();

  const inProduction = orders.filter((o) => BOARD_STAGES.includes((o.status as OrderStage) ?? ""));
  const overdue = orders.filter(isOverdue);
  const express = inProduction.filter((o) => o.productionSpeed === "express");

  return (
    <div>
      <PageHeader title="Production" description="Track garments moving through the atelier, from measurements to dispatch." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders In Production" value={inProduction.length} />
        <StatCard label="Express Orders" value={express.length} />
        <StatCard label="Overdue" value={overdue.length} />
        <StatCard label="Completed This Month" value={orders.filter((o) => o.production?.actualCompletionDate && new Date(o.production.actualCompletionDate).getMonth() === new Date().getMonth()).length} />
      </div>

      <Tabs
        tabs={[
          { key: "board", label: "Production Board" },
          { key: "calendar", label: "Calendar" },
          { key: "staff", label: "Staff" },
          { key: "timeline", label: "Timeline Rules" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5">
        {tab === "board" && <Board orders={inProduction} />}
        {tab === "calendar" && <ProductionCalendar orders={orders} />}
        {tab === "staff" && <Staff />}
        {tab === "timeline" && <TimelineRules />}
      </div>
    </div>
  );
}

function Board({ orders }: { orders: Order[] }) {
  const { productionStaff } = useAdminStore();
  const { assignProduction } = useOrders();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [openId, setOpenId] = useState<string | null>(null);

  const byStage = BOARD_STAGES.map((stage) => ({
    stage,
    orders: orders
      .filter((o) => o.status === stage)
      .sort((a, b) => (b.production?.priority ?? 0) - (a.production?.priority ?? 0)),
  }));

  const open = orders.find((o) => o.id === openId);

  return (
    <>
      <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-5">
        {byStage.map((col) => (
          <div key={col.stage} className="min-w-[240px]">
            <p className="eyebrow mb-2 flex items-center justify-between">
              {col.stage}
              <span className="text-ink/30">{col.orders.length}</span>
            </p>
            <div className="space-y-2">
              {col.orders.map((o) => {
                const staff = productionStaff.find((s) => s.id === o.production?.assignedStaffId);
                const overdue = isOverdue(o);
                return (
                  <button
                    key={o.id}
                    onClick={() => setOpenId(o.id)}
                    className={`block w-full border bg-ivory p-3 text-left text-xs ${overdue ? "border-error/50 bg-error/5" : "border-line hover:border-brass"}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">{o.id}</span>
                      {o.productionSpeed === "express" && <Badge tone="brass">Express</Badge>}
                    </div>
                    <p className="text-ink/50">{o.address.fullName}</p>
                    <p className={`mt-1 ${overdue ? "text-error" : "text-ink/40"}`}>
                      Due {o.production?.expectedCompletionDate ? formatDate(o.production.expectedCompletionDate) : "—"}
                      {overdue && " · Overdue"}
                    </p>
                    <p className="mt-1 text-ink/40">{staff ? staff.name : "Unassigned"}</p>
                  </button>
                );
              })}
              {col.orders.length === 0 && <p className="text-xs text-ink/30">Nothing here.</p>}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.id}>
          <div className="mb-3 flex items-center gap-2">
            <StatusPill status={open.status ?? "Order Placed"} />
            {open.productionSpeed === "express" && <Badge tone="brass">Express</Badge>}
          </div>
          <Card>
            <div className="space-y-2 text-sm">
              <Row label="Customer" value={open.address.fullName} />
              <Row label="Country" value={open.address.country} />
              <Row label="Items" value={open.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")} />
              <Row label="Expected Completion" value={open.production?.expectedCompletionDate ? formatDate(open.production.expectedCompletionDate) : "—"} />
              <Row label="Priority Score" value={String(open.production?.priority ?? 0)} />
            </div>
          </Card>
          {can("production", "edit") && (
            <div className="mt-4">
              <SelectField
                label="Assigned Staff"
                value={open.production?.assignedStaffId ?? ""}
                onChange={(v) => {
                  assignProduction(open.id, v);
                  const staff = productionStaff.find((s) => s.id === v);
                  audit("production.staff_assigned", "production", `Assigned ${staff?.name ?? v} to order ${open.id}.`, { resourceId: open.id });
                }}
                options={[{ value: "", label: "Unassigned" }, ...productionStaff.map((s) => ({ value: s.id, label: `${s.name} — ${s.role}` }))]}
              />
            </div>
          )}
          <Button href={`/admin/orders?open=${open.id}`} variant="secondary" className="mt-4 w-full">
            Open Full Order — Measurements &amp; Production Brief
          </Button>
        </Drawer>
      )}
    </>
  );
}

function ProductionCalendar({ orders }: { orders: Order[] }) {
  const withDeadlines = orders.filter((o) => o.production?.expectedCompletionDate && !["Delivered", "Cancelled"].includes(o.status ?? ""));
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const byDay = new Map<number, Order[]>();
  withDeadlines.forEach((o) => {
    const d = new Date(o.production!.expectedCompletionDate!);
    if (d.getFullYear() === year && d.getMonth() === month) {
      byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), o]);
    }
  });

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card>
        <p className="eyebrow mb-3">{firstDay.toLocaleDateString("en-NG", { month: "long", year: "numeric" })}</p>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink/40">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const dayOrders = day ? byDay.get(day) ?? [] : [];
            const isToday = day === now.getDate();
            const hasOverdue = dayOrders.some(isOverdue);
            return (
              <div key={i} className={`h-16 border p-1 text-[10px] ${day ? "border-line" : "border-transparent"} ${isToday ? "bg-brass/10" : ""}`}>
                {day && (
                  <>
                    <p className={isToday ? "font-medium text-brass" : "text-ink/50"}>{day}</p>
                    {dayOrders.length > 0 && (
                      <p className={`mt-1 ${hasOverdue ? "text-error" : "text-ink/60"}`}>{dayOrders.length} due</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <p className="eyebrow mb-3">Upcoming Deadlines</p>
        <ul className="space-y-2.5 text-sm">
          {withDeadlines
            .sort((a, b) => new Date(a.production!.expectedCompletionDate!).getTime() - new Date(b.production!.expectedCompletionDate!).getTime())
            .slice(0, 10)
            .map((o) => (
              <li key={o.id} className={`flex items-center justify-between border-b border-line pb-2 ${isOverdue(o) ? "text-error" : ""}`}>
                <span>{o.id}</span>
                <span className="text-xs">{formatDate(o.production!.expectedCompletionDate!)}</span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

function Staff() {
  const { productionStaff, setProductionStaff } = useAdminStore();
  const { orders } = useOrders();
  const { can } = useAdminAuth();
  const [editing, setEditing] = useState<ProductionStaff | null>(null);
  const [creating, setCreating] = useState(false);

  const withLoad = productionStaff.map((s) => ({ ...s, activeOrders: orders.filter((o) => o.production?.assignedStaffId === s.id && !["Delivered", "Cancelled"].includes(o.status ?? "")).length }));

  async function save(s: ProductionStaff) {
    const exists = productionStaff.some((item) => item.id === s.id);
    try {
      const saved = await apiRequest<ProductionStaff>(exists ? `/admin/production-staff/${encodeURIComponent(s.id)}` : "/admin/production-staff", {
        method: exists ? "PUT" : "POST",
        body: { name: s.name, role: s.role, email: s.email, capacityPerWeek: s.capacityPerWeek, status: s.status === "on-leave" ? "on_leave" : s.status },
      });
      const normalized = { ...saved, status: String(saved.status) === "on_leave" ? "on-leave" as const : saved.status };
      setProductionStaff((prev) => exists ? prev.map((item) => item.id === s.id ? normalized : item) : [...prev, normalized]);
      setEditing(null);
      setCreating(false);
    } catch (error) {
      toast("Staff member was not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  const columns: Column<ProductionStaff>[] = [
    { key: "name", label: "Name", render: (s) => s.name, sortValue: (s) => s.name, csvValue: (s) => s.name },
    { key: "role", label: "Role", render: (s) => s.role, csvValue: (s) => s.role },
    { key: "active", label: "Active Orders", align: "right", render: (s) => s.activeOrders, csvValue: (s) => s.activeOrders },
    { key: "capacity", label: "Weekly Capacity", align: "right", render: (s) => s.capacityPerWeek, csvValue: (s) => s.capacityPerWeek },
    { key: "status", label: "Status", render: (s) => <StatusPill status={s.status} />, csvValue: (s) => s.status },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {can("production", "create") && <Button size="sm" onClick={() => setCreating(true)}>Add Staff</Button>}
      </div>
      <DataTable columns={columns} rows={withLoad} getRowId={(s) => s.id} pageSize={10} onRowClick={(s) => setEditing(s)} />

      {(editing || creating) && (
        <StaffModal staff={editing} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}
    </div>
  );
}

function StaffModal({ staff, onCancel, onSave }: { staff: ProductionStaff | null; onCancel: () => void; onSave: (s: ProductionStaff) => void }) {
  const [form, setForm] = useState<ProductionStaff>(() => staff ?? { id: `ps-${Date.now().toString(36)}`, name: "", role: "Tailor", email: "", activeOrders: 0, capacityPerWeek: 10, status: "active" });
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm border border-line bg-ivory p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 font-display text-xl">{staff ? "Edit Staff" : "Add Staff"}</h2>
        <div className="space-y-4">
          <Field label="Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <NumberField label="Weekly Capacity" value={form.capacityPerWeek} onChange={(v) => setForm({ ...form, capacityPerWeek: v })} />
          <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[{ value: "active", label: "Active" }, { value: "on-leave", label: "On Leave" }, { value: "inactive", label: "Inactive" }]} />
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function TimelineRules() {
  const { productionTimelineRules, setProductionTimelineRules } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<ProductionTimelineRule | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(rule: ProductionTimelineRule) {
    const exists = productionTimelineRules.some((item) => item.id === rule.id);
    try {
      const saved = await apiRequest<Record<string, unknown>>(exists ? `/admin/production-timeline-rules/${encodeURIComponent(rule.id)}` : "/admin/production-timeline-rules", {
        method: exists ? "PUT" : "POST",
        body: {
          scope: rule.scope,
          scopeRef: rule.scope === "global" ? undefined : rule.scopeRef,
          standardDaysMin: rule.standardDays[0],
          standardDaysMax: rule.standardDays[1],
          expressDaysMin: rule.expressDays[0],
          expressDaysMax: rule.expressDays[1],
        },
      });
      const normalized: ProductionTimelineRule = {
        id: String(saved.id), scope: saved.scope as ProductionTimelineRule["scope"],
        scopeRef: saved.scopeRef ? String(saved.scopeRef) : undefined,
        standardDays: [Number(saved.standardDaysMin), Number(saved.standardDaysMax)],
        expressDays: [Number(saved.expressDaysMin), Number(saved.expressDaysMax)],
      };
      setProductionTimelineRules((prev) => exists ? prev.map((item) => item.id === rule.id ? normalized : item) : [...prev, normalized]);
      audit("production.timeline_rule_saved", "production", `Saved production timeline rule (${rule.scope}${rule.scopeRef ? `: ${rule.scopeRef}` : ""}).`, {});
      setEditing(null);
      setCreating(false);
    } catch (error) {
      toast("Timeline rule was not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  const columns: Column<ProductionTimelineRule>[] = [
    { key: "scope", label: "Scope", render: (r) => (r.scope === "global" ? "Global default" : `${r.scope}: ${r.scopeRef}`), csvValue: (r) => r.scope },
    { key: "standard", label: "Standard (days)", render: (r) => `${r.standardDays[0]}–${r.standardDays[1]}`, csvValue: (r) => `${r.standardDays[0]}-${r.standardDays[1]}` },
    { key: "express", label: "Express (days)", render: (r) => `${r.expressDays[0]}–${r.expressDays[1]}`, csvValue: (r) => `${r.expressDays[0]}-${r.expressDays[1]}` },
  ];

  return (
    <div>
      <p className="mb-4 text-sm text-ink/50">
        Configure standard and express production windows globally, or override per product, collection, garment type, or country. Express orders are
        automatically prioritized in the production queue.
      </p>
      <div className="mb-4 flex justify-end">
        {can("production", "create") && <Button size="sm" onClick={() => setCreating(true)}>Add Rule</Button>}
      </div>
      <DataTable columns={columns} rows={productionTimelineRules} getRowId={(r) => r.id} pageSize={10} onRowClick={(r) => setEditing(r)} />

      {(editing || creating) && <RuleModal rule={editing} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />}
    </div>
  );
}

function RuleModal({ rule, onCancel, onSave }: { rule: ProductionTimelineRule | null; onCancel: () => void; onSave: (r: ProductionTimelineRule) => void }) {
  const [form, setForm] = useState<ProductionTimelineRule>(() => rule ?? { id: `ptr-${Date.now().toString(36)}`, scope: "product", standardDays: [7, 14], expressDays: [3, 5] });
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm border border-line bg-ivory p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 font-display text-xl">{rule ? "Edit Rule" : "New Timeline Rule"}</h2>
        <div className="space-y-4">
          <SelectField label="Scope" value={form.scope} onChange={(v) => setForm({ ...form, scope: v })} options={[{ value: "global", label: "Global" }, { value: "product", label: "Product" }, { value: "collection", label: "Collection" }, { value: "garment", label: "Garment Type" }, { value: "country", label: "Country" }]} />
          {form.scope !== "global" && <Field label="Scope Reference (name/slug)" value={form.scopeRef ?? ""} onChange={(v) => setForm({ ...form, scopeRef: v })} />}
          <div className="flex gap-2">
            <NumberField label="Standard Min" value={form.standardDays[0]} onChange={(v) => setForm({ ...form, standardDays: [v, form.standardDays[1]] })} />
            <NumberField label="Standard Max" value={form.standardDays[1]} onChange={(v) => setForm({ ...form, standardDays: [form.standardDays[0], v] })} />
          </div>
          <div className="flex gap-2">
            <NumberField label="Express Min" value={form.expressDays[0]} onChange={(v) => setForm({ ...form, expressDays: [v, form.expressDays[1]] })} />
            <NumberField label="Express Max" value={form.expressDays[1]} onChange={(v) => setForm({ ...form, expressDays: [form.expressDays[0], v] })} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => onSave(form)}>Save Rule</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-ink/50">{label}</span>
      <span className="text-right text-ink/85">{value}</span>
    </div>
  );
}
