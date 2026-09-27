"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { PermissionAction, PermissionResource, Role } from "@/lib/admin/types";
import { PageHeader, Card, Badge, Modal } from "@/components/admin/ui/primitives";
import { Field, TextareaField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "approve", "export", "refund", "publish"];
const RESOURCES: { key: PermissionResource; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "collections", label: "Collections" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "measurements", label: "Measurements" },
  { key: "payments", label: "Payments" },
  { key: "refunds", label: "Refunds" },
  { key: "production", label: "Production" },
  { key: "delivery", label: "Delivery" },
  { key: "promotions", label: "Promotions" },
  { key: "reviews", label: "Reviews" },
  { key: "content", label: "Content" },
  { key: "notifications", label: "Notifications" },
  { key: "analytics", label: "Analytics" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
  { key: "admin_users", label: "Admin Users" },
  { key: "audit_logs", label: "Audit Logs" },
];

export default function AdminRolesPage() {
  const { roles, upsertRole, adminUsers } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [activeRoleId, setActiveRoleId] = useState(roles[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const canEdit = can("admin_users", "edit");

  const role = roles.find((r) => r.id === activeRoleId) ?? roles[0];
  const locked = role?.id === "super-admin";

  function toggle(resource: PermissionResource, action: PermissionAction) {
    if (!role || locked || !canEdit) return;
    const current = role.permissions[resource] ?? [];
    const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
    const updated: Role = { ...role, permissions: { ...role.permissions, [resource]: next } };
    upsertRole(updated);
    audit("role.permission_changed", "admin_users", `${current.includes(action) ? "Removed" : "Granted"} ${action} on ${resource} for role "${role.name}".`, { resourceId: role.id });
  }

  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Granular, resource-level access control for every admin role." actions={canEdit && <Button onClick={() => setCreating(true)}>New Role</Button>} />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-1.5">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoleId(r.id)}
              className={`block w-full border px-3 py-2.5 text-left text-sm ${activeRoleId === r.id ? "border-brass bg-brass/5 text-brass" : "border-line hover:border-brass"}`}
            >
              <span className="flex items-center justify-between">
                {r.name}
                <span className="text-xs text-ink/35">{adminUsers.filter((u) => u.roleId === r.id).length}</span>
              </span>
            </button>
          ))}
        </div>

        {role && (
          <div>
            <Card className="mb-4">
              <p className="font-display text-lg">{role.name}</p>
              <p className="mt-1 text-sm text-ink/55">{role.description}</p>
              {locked && <Badge tone="brass">Full access — not editable</Badge>}
            </Card>

            <div className="overflow-x-auto border border-line bg-ivory">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink/40">
                    <th className="px-3 py-2.5 font-normal">Resource</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="px-2 py-2.5 text-center font-normal capitalize">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((r) => (
                    <tr key={r.key} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 font-medium text-ink/80">{r.label}</td>
                      {ACTIONS.map((a) => (
                        <td key={a} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(role.permissions[r.key]?.includes(a))}
                            onChange={() => toggle(r.key, a)}
                            disabled={locked || !canEdit}
                            className="accent-brass disabled:opacity-40"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <NewRoleModal
          onCancel={() => setCreating(false)}
          onSave={(r) => {
            upsertRole(r);
            audit("role.created", "admin_users", `Created role "${r.name}".`, { resourceId: r.id });
            setActiveRoleId(r.id);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function NewRoleModal({ onCancel, onSave }: { onCancel: () => void; onSave: (r: Role) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <Modal open onClose={onCancel} title="New Role">
      <div className="space-y-4">
        <Field label="Role Name" required value={name} onChange={setName} />
        <TextareaField label="Description" value={description} onChange={setDescription} rows={2} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button
          onClick={() =>
            onSave({ id: `role-${Date.now().toString(36)}`, name, description, isSystem: false, permissions: { dashboard: ["view"] } })
          }
          disabled={!name}
        >
          Create Role
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
