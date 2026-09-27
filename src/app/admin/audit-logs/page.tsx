"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { formatDate } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/admin/types";
import { PageHeader, Card, Drawer } from "@/components/admin/ui/primitives";
import { DataTable, Column, exportCsv } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";

export default function AdminAuditLogsPage() {
  const { auditLogs, adminUsers } = useAdminStore();
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLogs.filter((l) => {
      if (q && !(l.summary.toLowerCase().includes(q) || l.action.toLowerCase().includes(q))) return false;
      if (actorFilter !== "all" && l.actorId !== actorFilter) return false;
      return true;
    });
  }, [auditLogs, search, actorFilter]);

  const open = auditLogs.find((l) => l.id === openId);

  const columns: Column<AuditLogEntry>[] = [
    { key: "actor", label: "Admin", render: (l) => l.actorName, sortValue: (l) => l.actorName, csvValue: (l) => l.actorName },
    { key: "action", label: "Action", render: (l) => l.action, sortValue: (l) => l.action, csvValue: (l) => l.action },
    { key: "resource", label: "Resource", render: (l) => l.resource, csvValue: (l) => l.resource },
    { key: "summary", label: "Summary", render: (l) => <span className="line-clamp-1 max-w-[320px]">{l.summary}</span>, csvValue: (l) => l.summary },
    { key: "date", label: "Date", render: (l) => formatDate(l.date), sortValue: (l) => l.date, csvValue: (l) => formatDate(l.date) },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="A record of administrative actions across the platform."
        actions={
          <button onClick={() => exportCsv("audit-logs.csv", columns, filtered)} className="border border-line px-3.5 py-2.5 text-xs hover:border-brass">
            Export CSV
          </button>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search action or summary…" />
        <FilterSelect ariaLabel="Admin" value={actorFilter} onChange={setActorFilter} options={[{ value: "all", label: "All Admins" }, ...adminUsers.map((u) => ({ value: u.id, label: u.name }))]} />
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(l) => l.id} emptyTitle="No audit activity yet" pageSize={15} onRowClick={(l) => setOpenId(l.id)} />

      {open && (
        <Drawer open onClose={() => setOpenId(null)} title="Audit Entry">
          <Card>
            <div className="space-y-2 text-sm">
              <Row label="Admin" value={open.actorName} />
              <Row label="Action" value={open.action} />
              <Row label="Resource" value={`${open.resource}${open.resourceId ? ` (${open.resourceId})` : ""}`} />
              <Row label="Date" value={formatDate(open.date)} />
              <Row label="IP" value={open.ip ?? "—"} />
              <Row label="Device" value={open.device ?? "—"} />
            </div>
          </Card>
          <Card className="mt-3">
            <p className="eyebrow mb-2">Summary</p>
            <p className="text-sm text-ink/70">{open.summary}</p>
          </Card>
          {(open.before !== undefined || open.after !== undefined) && (
            <Card className="mt-3">
              <p className="eyebrow mb-2">Change</p>
              <pre className="overflow-x-auto text-xs text-ink/60">{JSON.stringify({ before: open.before, after: open.after }, null, 2)}</pre>
            </Card>
          )}
        </Drawer>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink/50">{label}</span>
      <span className="text-right text-ink/85">{value}</span>
    </div>
  );
}
