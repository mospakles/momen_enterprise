"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { EmailTemplate } from "@/lib/admin/types";
import { PageHeader, Card, Drawer } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, TextareaField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

const SAMPLE_VALUES: Record<string, string> = {
  customerName: "Ifeoma Chukwu",
  orderNumber: "MOM-104213",
  productName: "Obi Tailored Shirt",
  totalAmount: "₦68,000",
  productionDate: "12 Aug 2026",
  deliveryDate: "20 Aug 2026",
  trackingNumber: "DHL-88213741",
};

function render(template: string) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => SAMPLE_VALUES[key] ?? `{{${key}}}`);
}

export default function AdminEmailTemplatesPage() {
  const { emailTemplates, upsertEmailTemplate, logNotification } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const columns: Column<EmailTemplate>[] = [
    { key: "name", label: "Template", render: (t) => t.name, sortValue: (t) => t.name, csvValue: (t) => t.name },
    { key: "subject", label: "Subject", render: (t) => t.subject, csvValue: (t) => t.subject },
    { key: "variables", label: "Variables", render: (t) => t.variables.join(", "), csvValue: (t) => t.variables.join(", ") },
    { key: "updated", label: "Last Updated", render: (t) => formatDate(t.updatedAt), sortValue: (t) => t.updatedAt, csvValue: (t) => formatDate(t.updatedAt) },
  ];

  return (
    <div>
      <PageHeader title="Email Templates" description="Transactional email content, with live variable preview." />
      <DataTable columns={columns} rows={emailTemplates} getRowId={(t) => t.id} pageSize={12} onRowClick={(t) => setEditing(t)} />

      {editing && (
        <TemplateDrawer
          template={editing}
          onClose={() => setEditing(null)}
          canEdit={can("notifications", "edit")}
          onSave={(t) => {
            upsertEmailTemplate(t);
            audit("email_template.updated", "notifications", `Updated email template "${t.name}".`, { resourceId: t.id });
            setEditing(null);
          }}
          onTestSend={(t) => {
            logNotification({ triggerId: t.key, channel: "email", recipient: "test@momen.studio", subject: render(t.subject), status: "sent" });
            toast("Test email sent", { description: "test@momen.studio", variant: "success" });
          }}
        />
      )}
    </div>
  );
}

function TemplateDrawer({
  template,
  onClose,
  onSave,
  onTestSend,
  canEdit,
}: {
  template: EmailTemplate;
  onClose: () => void;
  onSave: (t: EmailTemplate) => void;
  onTestSend: (t: EmailTemplate) => void;
  canEdit: boolean;
}) {
  const [form, setForm] = useState(template);

  return (
    <Drawer open onClose={onClose} title={form.name} wide>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} disabled={!canEdit} />
          <TextareaField label="Body" value={form.body} onChange={(v) => setForm({ ...form, body: v })} rows={12} />
          <div>
            <p className="mb-1.5 text-xs text-ink/50">Insert variable:</p>
            <div className="flex flex-wrap gap-1.5">
              {form.variables.map((v) => (
                <button key={v} onClick={() => setForm({ ...form, body: `${form.body} {{${v}}}` })} className="border border-line px-2 py-1 text-[11px] font-mono hover:border-brass">
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-3">
              <Button onClick={() => onSave(form)}>Save Template</Button>
              <Button variant="secondary" onClick={() => onTestSend(form)}>Send Test</Button>
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow mb-2">Live Preview</p>
          <Card>
            <p className="mb-3 border-b border-line pb-2 text-sm font-medium">{render(form.subject)}</p>
            <p className="whitespace-pre-wrap text-sm text-ink/70">{render(form.body)}</p>
          </Card>
        </div>
      </div>
    </Drawer>
  );
}
