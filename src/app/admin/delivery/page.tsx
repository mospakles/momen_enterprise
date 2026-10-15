"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatNaira } from "@/lib/format";
import type { DeliveryZone } from "@/lib/admin/types";
import { PageHeader, Card, StatusPill, Modal, Tabs, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, NumberField, TagInput, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `dz-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminDeliveryPage() {
  const [tab, setTab] = useState("zones");
  return (
    <div>
      <PageHeader title="Delivery" description="Configure delivery zones, fees, and express availability. Checkout reads these settings live." />
      <Tabs tabs={[{ key: "zones", label: "Delivery Zones" }, { key: "express", label: "Express Settings" }]} active={tab} onChange={setTab} />
      <div className="mt-5">{tab === "zones" ? <Zones /> : <ExpressSettings />}</div>
    </div>
  );
}

function Zones() {
  const { deliveryZones, upsertDeliveryZone, deleteDeliveryZone } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(z: DeliveryZone) {
    const isNew = !deliveryZones.some((x) => x.id === z.id);
    upsertDeliveryZone(z);
    audit(isNew ? "delivery_zone.created" : "delivery_zone.updated", "delivery", `${isNew ? "Created" : "Updated"} delivery zone "${z.name}".`, { resourceId: z.id });
    setEditing(null);
    setCreating(false);
  }

  const columns: Column<DeliveryZone>[] = [
    { key: "name", label: "Zone", render: (z) => z.name, sortValue: (z) => z.name, csvValue: (z) => z.name },
    { key: "countries", label: "Countries", render: (z) => <span className="line-clamp-1 max-w-[220px]">{z.countries.join(", ")}</span>, csvValue: (z) => z.countries.join(", ") },
    { key: "standardFee", label: "Standard Fee", align: "right", render: (z) => formatNaira(z.standardFee), sortValue: (z) => z.standardFee, csvValue: (z) => z.standardFee },
    { key: "expressFee", label: "Express Fee", align: "right", render: (z) => (z.expressAvailable ? formatNaira(z.expressFee) : "—"), csvValue: (z) => z.expressFee },
    { key: "standardDays", label: "Standard Days", render: (z) => `${z.standardDays[0]}–${z.standardDays[1]}`, csvValue: (z) => `${z.standardDays[0]}-${z.standardDays[1]}` },
    { key: "status", label: "Status", render: (z) => <StatusPill status={z.active ? "active" : "disabled"} />, csvValue: (z) => (z.active ? "active" : "disabled") },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {can("delivery", "create") && <Button size="sm" onClick={() => setCreating(true)}>New Zone</Button>}
      </div>
      <DataTable columns={columns} rows={deliveryZones} getRowId={(z) => z.id} emptyTitle="No delivery zones configured" pageSize={10} onRowClick={(z) => setEditing(z)} />

      {(editing || creating) && (
        <ZoneModal
          zone={editing}
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
            const z = deliveryZones.find((x) => x.id === confirmDelete);
            deleteDeliveryZone(confirmDelete);
            audit("delivery_zone.deleted", "delivery", `Deleted delivery zone "${z?.name}".`, { resourceId: confirmDelete });
          }
          setEditing(null);
        }}
        title="Delete this delivery zone?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ZoneModal({ zone, onCancel, onSave, onDelete }: { zone: DeliveryZone | null; onCancel: () => void; onSave: (z: DeliveryZone) => void; onDelete?: () => void }) {
  const [form, setForm] = useState<DeliveryZone>(
    zone ?? { id: "", name: "", countries: [], standardFee: 0, expressFee: 0, standardDays: [5, 9], expressDays: [3, 5], expressAvailable: true, active: true }
  );
  function set<K extends keyof DeliveryZone>(key: K, value: DeliveryZone[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={zone ? `Edit — ${zone.name}` : "New Delivery Zone"} size="lg">
      <div className="space-y-4">
        <Field label="Zone Name" required value={form.name} onChange={(v) => set("name", v)} />
        <TagInput label="Countries" values={form.countries} onChange={(v) => set("countries", v)} placeholder="Add a country and press Enter" />
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Standard Fee (₦)" value={form.standardFee} onChange={(v) => set("standardFee", v)} />
          <NumberField label="Express Fee (₦)" value={form.expressFee} onChange={(v) => set("expressFee", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-2">
            <NumberField label="Standard Min Days" value={form.standardDays[0]} onChange={(v) => set("standardDays", [v, form.standardDays[1]])} />
            <NumberField label="Standard Max Days" value={form.standardDays[1]} onChange={(v) => set("standardDays", [form.standardDays[0], v])} />
          </div>
          <div className="flex gap-2">
            <NumberField label="Express Min Days" value={form.expressDays[0]} onChange={(v) => set("expressDays", [v, form.expressDays[1]])} />
            <NumberField label="Express Max Days" value={form.expressDays[1]} onChange={(v) => set("expressDays", [form.expressDays[0], v])} />
          </div>
        </div>
        <NumberField label="Free Delivery Threshold (₦, optional)" value={form.freeDeliveryThreshold ?? 0} onChange={(v) => set("freeDeliveryThreshold", v || undefined)} />
        <Toggle label="Express delivery available in this zone" checked={form.expressAvailable} onChange={(v) => set("expressAvailable", v)} />
        <Toggle label="Pickup available (customers collect in person)" checked={Boolean(form.pickupAvailable)} onChange={(v) => set("pickupAvailable", v)} />
        {form.pickupAvailable && (
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <Field label="Pickup location (shown at checkout)" value={form.pickupLocation ?? ""} onChange={(v) => set("pickupLocation", v)} />
            <NumberField label="Pickup fee (₦)" value={form.pickupFee ?? 0} onChange={(v) => set("pickupFee", v)} min={0} />
          </div>
        )}
        <Toggle label="Zone active" checked={form.active} onChange={(v) => set("active", v)} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.name || form.countries.length === 0}>Save Zone</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-ink/40 hover:text-error">Delete</button>}
      </div>
    </Modal>
  );
}

function ExpressSettings() {
  const { productionTimelineRules, deliveryZones } = useAdminStore();
  const globalRule = productionTimelineRules.find((rule) => rule.scope === "global");
  const expressZones = deliveryZones.filter((z) => z.expressAvailable);

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <p className="eyebrow mb-4">Global Production Defaults</p>
        {globalRule ? (
          <div className="space-y-2 text-sm text-ink/70">
            <p>Standard production: {globalRule.standardDays[0]}–{globalRule.standardDays[1]} days</p>
            <p>Express production: {globalRule.expressDays[0]}–{globalRule.expressDays[1]} days</p>
            <p className="text-xs text-ink/45">Edit this rule from Production → Timeline Rules. Delivery fees remain specific to each zone.</p>
          </div>
        ) : <p className="text-sm text-ink/45">No global production timeline rule is configured.</p>}
      </Card>

      <Card>
        <p className="eyebrow mb-3">Express-Eligible Zones</p>
        <ul className="space-y-1.5 text-sm text-ink/70">
          {expressZones.map((z) => (
            <li key={z.id} className="flex justify-between border-b border-line py-1.5 last:border-0">
              <span>{z.name}</span>
              <span className="text-ink/45">{formatNaira(z.expressFee)} · {z.expressDays[0]}–{z.expressDays[1]}d</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink/40">Manage per-zone express fees and eligibility from the Delivery Zones tab. Per-product and per-collection express eligibility is managed on each product/collection.</p>
      </Card>
    </div>
  );
}
