"use client";

import { useAdminStore } from "@/lib/admin/store";
import { useOrders } from "@/lib/orders-context";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, StatCard, StatusPill } from "@/components/admin/ui/primitives";

export default function AdminSystemHealthPage() {
  const { systemHealthChecks, mediaAssets, auditLogs } = useAdminStore();
  const { orders, isReady } = useOrders();

  const operational = systemHealthChecks.filter((c) => c.status === "operational").length;
  const degraded = systemHealthChecks.filter((c) => c.status === "degraded").length;
  const down = systemHealthChecks.filter((c) => c.status === "down").length;

  return (
    <div>
      <PageHeader title="System Health" description="Live status of the services the Momen platform depends on." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Operational" value={operational} />
        <StatCard label="Degraded" value={degraded} />
        <StatCard label="Down" value={down} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {systemHealthChecks.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{c.name}</p>
              <StatusPill status={c.status} />
            </div>
            <p className="mt-2 text-xs text-ink/45">{c.latencyMs ? `${c.latencyMs}ms latency` : "—"}</p>
            <p className="text-xs text-ink/35">Checked {formatDate(c.lastCheckedAt)}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders Store" value={isReady ? `${orders.length} records` : "Loading…"} />
        <StatCard label="Media Library" value={`${mediaAssets.length} assets`} />
        <StatCard label="Audit Log Entries" value={`${auditLogs.length} entries`} />
      </div>

      <Card className="mt-6">
        <p className="eyebrow mb-2">About This Environment</p>
        <p className="text-sm text-ink/60">
          This is a demo environment — data is stored in your browser&rsquo;s local storage rather than a live database, and
          the checks above are illustrative. In production, this page would poll real infrastructure endpoints (API uptime,
          webhook delivery, queue depth, background job health) on an interval.
        </p>
      </Card>
    </div>
  );
}
