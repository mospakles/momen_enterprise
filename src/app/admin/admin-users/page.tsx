"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import type { AdminUser, AdminUserStatus } from "@/lib/admin/types";
import { PageHeader, StatusPill, Modal, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, SelectField, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `au-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminUsersPage() {
  const { adminUsers, roles, upsertAdminUser, deleteAdminUser } = useAdminStore();
  const { currentUser, can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function roleName(id: string) {
    return roles.find((r) => r.id === id)?.name ?? id;
  }

  function save(u: AdminUser) {
    const isNew = !adminUsers.some((x) => x.id === u.id);
    upsertAdminUser(u);
    audit(isNew ? "admin_user.invited" : "admin_user.updated", "admin_users", `${isNew ? "Invited" : "Updated"} admin user "${u.name}".`, { resourceId: u.id });
    setEditing(null);
    setCreating(false);
  }

  function toggleStatus(u: AdminUser) {
    const next: AdminUserStatus = u.status === "disabled" ? "active" : "disabled";
    upsertAdminUser({ ...u, status: next });
    audit("admin_user.status_changed", "admin_users", `${next === "disabled" ? "Disabled" : "Re-enabled"} "${u.name}".`, { resourceId: u.id });
  }

  const columns: Column<AdminUser>[] = [
    { key: "name", label: "Name", render: (u) => <div><p className="font-medium">{u.name}</p><p className="text-xs text-ink/40">{u.email}</p></div>, sortValue: (u) => u.name, csvValue: (u) => u.name },
    { key: "role", label: "Role", render: (u) => roleName(u.roleId), csvValue: (u) => roleName(u.roleId) },
    { key: "status", label: "Status", render: (u) => <StatusPill status={u.status} />, sortValue: (u) => u.status, csvValue: (u) => u.status },
    { key: "2fa", label: "2FA", render: (u) => (u.twoFactorEnabled ? "Enabled" : "Off"), csvValue: (u) => (u.twoFactorEnabled ? "Enabled" : "Off") },
    { key: "lastLogin", label: "Last Login", render: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"), sortValue: (u) => u.lastLoginAt ?? "", csvValue: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never") },
    {
      key: "actions",
      label: "",
      render: (u) =>
        can("admin_users", "edit") &&
        u.id !== currentUser?.id && (
          <button onClick={(e) => { e.stopPropagation(); toggleStatus(u); }} className="text-xs text-clay hover:text-brass">
            {u.status === "disabled" ? "Enable" : "Disable"}
          </button>
        ),
      csvValue: () => "",
    },
  ];

  return (
    <div>
      <PageHeader title="Admin Users" description="Manage who has access to the dashboard and what they can do." actions={can("admin_users", "create") && <Button onClick={() => setCreating(true)}>Invite Admin</Button>} />

      <DataTable columns={columns} rows={adminUsers} getRowId={(u) => u.id} pageSize={10} onRowClick={(u) => setEditing(u)} />

      {(editing || creating) && (
        <UserModal
          user={editing}
          roles={roles}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={save}
          onDelete={editing && editing.id !== currentUser?.id ? () => setConfirmDelete(editing.id) : undefined}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const u = adminUsers.find((x) => x.id === confirmDelete);
            deleteAdminUser(confirmDelete);
            audit("admin_user.removed", "admin_users", `Removed admin user "${u?.name}".`, { resourceId: confirmDelete });
          }
          setEditing(null);
        }}
        title="Remove this admin user?"
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}

function UserModal({
  user,
  roles,
  onCancel,
  onSave,
  onDelete,
}: {
  user: AdminUser | null;
  roles: { id: string; name: string }[];
  onCancel: () => void;
  onSave: (u: AdminUser) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<AdminUser>(user ?? { id: "", name: "", email: "", roleId: roles[0]?.id ?? "", status: "invited", twoFactorEnabled: false, createdAt: new Date().toISOString() });
  function set<K extends keyof AdminUser>(key: K, value: AdminUser[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Modal open onClose={onCancel} title={user ? `Edit — ${user.name}` : "Invite Admin User"}>
      <div className="space-y-4">
        <Field label="Full Name" required value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Email" required type="email" value={form.email} onChange={(v) => set("email", v)} />
        <SelectField label="Role" value={form.roleId} onChange={(v) => set("roleId", v)} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
        <Toggle label="Require Two-Factor Authentication" checked={form.twoFactorEnabled} onChange={(v) => set("twoFactorEnabled", v)} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId() })} disabled={!form.name || !form.email}>
          {user ? "Save Changes" : "Send Invite"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-ink/40 hover:text-error">Remove</button>}
      </div>
    </Modal>
  );
}
