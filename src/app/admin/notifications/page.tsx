"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { NotificationChannel, NotificationTrigger } from "@/lib/admin/types";
import { PageHeader, Card, StatusPill, Tabs } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { apiRequest } from "@/lib/api";

const CHANNELS: NotificationChannel[] = ["email", "in-app", "sms"];

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState("triggers");
  return (
    <div>
      <PageHeader title="Notifications" description="Configure which events trigger customer and internal notifications." />
      <Tabs tabs={[{ key: "triggers", label: "Triggers" }, { key: "log", label: "Activity Log" }]} active={tab} onChange={setTab} />
      <div className="mt-5">{tab === "triggers" ? <Triggers /> : <Log />}</div>
    </div>
  );
}

function Triggers() {
  const { notificationTriggers, setNotificationTriggers, emailTemplates } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();

  async function saveTrigger(trigger: NotificationTrigger, patch: Partial<NotificationTrigger>) {
    const next = { ...trigger, ...patch };
    try {
      await apiRequest(`/admin/notification-triggers/${encodeURIComponent(trigger.id)}`, {
        method: "PUT",
        body: {
          channels: next.channels.map((channel) => channel === "in-app" ? "in_app" : channel),
          enabled: next.enabled,
          emailTemplateId: next.emailTemplateId,
        },
      });
      setNotificationTriggers((prev) => prev.map((item) => item.id === trigger.id ? next : item));
    } catch (error) {
      toast("Notification trigger was not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  function toggle(id: string) {
    const t = notificationTriggers.find((x) => x.id === id);
    if (!t) return;
    void saveTrigger(t, { enabled: !t.enabled });
    audit("notification_trigger.toggled", "notifications", `${t?.enabled ? "Disabled" : "Enabled"} trigger "${t?.label}".`, { resourceId: id });
  }

  function toggleChannel(trigger: NotificationTrigger, channel: NotificationChannel) {
    const channels = trigger.channels.includes(channel)
      ? trigger.channels.filter((item) => item !== channel)
      : [...trigger.channels, channel];
    void saveTrigger(trigger, { channels });
  }

  async function sendTest(trigger: NotificationTrigger) {
    try {
      await apiRequest("/admin/notifications/test", { method: "POST", body: { triggerId: trigger.id } });
      toast("Test notification sent", { description: "Sent to your admin email address.", variant: "success" });
    } catch (error) {
      toast("Test notification failed", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <div className="space-y-3">
      {notificationTriggers.map((t) => (
        <Card key={t.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{t.label}</p>
                <StatusPill status={t.enabled ? "active" : "disabled"} />
              </div>
              <p className="mt-1 text-xs text-ink/50">{t.description}</p>
              {t.emailTemplateId && <p className="mt-1 text-xs text-clay">Template: {emailTemplates.find((e) => e.id === t.emailTemplateId)?.name}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {CHANNELS.map((c) => (
                  <label key={c} className="flex items-center gap-1 text-xs text-ink/60">
                    <input type="checkbox" checked={t.channels.includes(c)} onChange={() => can("notifications", "edit") && toggleChannel(t, c)} className="accent-brass" disabled={!can("notifications", "edit")} />
                    {c}
                  </label>
                ))}
              </div>
              {can("notifications", "edit") && (
                <button onClick={() => toggle(t.id)} className="border border-line px-2.5 py-1 text-xs hover:border-brass">
                  {t.enabled ? "Disable" : "Enable"}
                </button>
              )}
              <button onClick={() => sendTest(t)} className="border border-line px-2.5 py-1 text-xs hover:border-brass">Send Test</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Log() {
  const { notificationLog } = useAdminStore();
  const columns: Column<(typeof notificationLog)[number]>[] = [
    { key: "subject", label: "Subject", render: (n) => n.subject, csvValue: (n) => n.subject },
    { key: "channel", label: "Channel", render: (n) => n.channel, csvValue: (n) => n.channel },
    { key: "recipient", label: "Recipient", render: (n) => n.recipient, csvValue: (n) => n.recipient },
    { key: "status", label: "Status", render: (n) => <StatusPill status={n.status} />, csvValue: (n) => n.status },
    { key: "date", label: "Date", render: (n) => formatDate(n.date), sortValue: (n) => n.date, csvValue: (n) => formatDate(n.date) },
  ];
  return <DataTable columns={columns} rows={notificationLog} getRowId={(n) => n.id} emptyTitle="No notifications sent yet" pageSize={15} />;
}
