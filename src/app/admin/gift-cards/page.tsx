"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate, formatNaira } from "@/lib/format";
import type { GiftCard } from "@/lib/admin/types";
import { PageHeader, StatCard, StatusPill, Modal } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Field, NumberField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genCode() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MOMEN-GC-${seg()}-${seg()}`;
}

export default function AdminGiftCardsPage() {
  const { giftCards, upsertGiftCard } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | GiftCard["status"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return giftCards.filter((g) => {
      if (q && !g.code.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      return true;
    });
  }, [giftCards, search, statusFilter]);

  const kpis = useMemo(
    () => ({
      active: giftCards.filter((g) => g.status === "active").length,
      outstanding: giftCards.filter((g) => g.status === "active").reduce((s, g) => s + g.balance, 0),
      issued: giftCards.reduce((s, g) => s + g.initialValue, 0),
    }),
    [giftCards]
  );

  const open = giftCards.find((g) => g.id === openId);

  const columns: Column<GiftCard>[] = [
    { key: "code", label: "Code", render: (g) => <span className="font-mono">{g.code}</span>, sortValue: (g) => g.code, csvValue: (g) => g.code },
    { key: "initial", label: "Initial Value", align: "right", render: (g) => formatNaira(g.initialValue), sortValue: (g) => g.initialValue, csvValue: (g) => g.initialValue },
    { key: "balance", label: "Balance", align: "right", render: (g) => formatNaira(g.balance), sortValue: (g) => g.balance, csvValue: (g) => g.balance },
    { key: "issuedTo", label: "Issued To", render: (g) => g.issuedTo ?? "—", csvValue: (g) => g.issuedTo ?? "" },
    { key: "status", label: "Status", render: (g) => <StatusPill status={g.status} />, sortValue: (g) => g.status, csvValue: (g) => g.status },
    { key: "created", label: "Created", render: (g) => formatDate(g.createdAt), sortValue: (g) => g.createdAt, csvValue: (g) => formatDate(g.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Gift Cards" description="Issue and track store gift card balances." actions={can("promotions", "create") && <Button onClick={() => setCreating(true)}>Issue Gift Card</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Gift Cards" value={kpis.active} />
        <StatCard label="Outstanding Balance" value={formatNaira(kpis.outstanding)} />
        <StatCard label="Total Issued" value={formatNaira(kpis.issued)} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search code…" />
        <FilterSelect ariaLabel="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "active", label: "Active" }, { value: "redeemed", label: "Redeemed" }, { value: "expired", label: "Expired" }, { value: "disabled", label: "Disabled" }]} />
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(g) => g.id} emptyTitle="No gift cards yet" pageSize={12} onRowClick={(g) => setOpenId(g.id)} />

      {open && (
        <Modal open onClose={() => setOpenId(null)} title={open.code}>
          <div className="space-y-2 text-sm">
            <Row label="Balance" value={formatNaira(open.balance)} />
            <Row label="Initial Value" value={formatNaira(open.initialValue)} />
            <Row label="Issued To" value={open.issuedTo ?? "—"} />
            <Row label="Status" value={open.status} />
          </div>
          <p className="eyebrow mb-2 mt-4">History</p>
          <ul className="space-y-2 text-xs text-ink/60">
            {open.history.map((h, i) => (
              <li key={i} className="border-b border-line pb-1.5 last:border-0">
                {formatDate(h.date)} — {h.amount > 0 ? "+" : ""}{formatNaira(h.amount)} — {h.note}
              </li>
            ))}
          </ul>
          {can("promotions", "edit") && open.status === "active" && (
            <button
              onClick={() => {
                upsertGiftCard({ ...open, status: "disabled" });
                audit("gift_card.disabled", "promotions", `Disabled gift card ${open.code}.`, { resourceId: open.id });
                setOpenId(null);
              }}
              className="mt-4 text-xs text-error hover:underline"
            >
              Disable card
            </button>
          )}
        </Modal>
      )}

      {creating && (
        <IssueModal
          onCancel={() => setCreating(false)}
          onIssue={(value, issuedTo) => {
            const card: GiftCard = {
              id: `gc-${Date.now().toString(36)}`,
              code: genCode(),
              initialValue: value,
              balance: value,
              currency: "NGN",
              issuedTo: issuedTo || undefined,
              status: "active",
              createdAt: new Date().toISOString(),
              history: [{ date: new Date().toISOString(), amount: value, note: "Issued by admin" }],
            };
            upsertGiftCard(card);
            audit("gift_card.issued", "promotions", `Issued a ${formatNaira(value)} gift card${issuedTo ? ` to ${issuedTo}` : ""}.`, { resourceId: card.id });
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function IssueModal({ onCancel, onIssue }: { onCancel: () => void; onIssue: (value: number, issuedTo: string) => void }) {
  const [value, setValue] = useState(50000);
  const [issuedTo, setIssuedTo] = useState("");
  return (
    <Modal open onClose={onCancel} title="Issue Gift Card">
      <div className="space-y-4">
        <NumberField label="Value (₦)" value={value} onChange={setValue} min={1000} />
        <Field label="Issue To (email, optional)" value={issuedTo} onChange={setIssuedTo} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onIssue(value, issuedTo)} disabled={value <= 0}>Issue Card</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
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
