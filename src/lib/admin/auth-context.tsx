"use client";

// Mock admin authentication. This is deliberately isolated from the rest of
// `AdminStoreProvider` state so the *shape* of a real auth integration is
// obvious: `login()` becomes a call to your auth API, the session becomes a
// signed cookie/JWT instead of localStorage, and `demoPassword` on the seed
// admin users disappears entirely (server-side password hashing only).
//
// Nothing here should be mistaken for production security — see the
// disclaimer surfaced on the login page itself.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAdminStore } from "./store";
import type { AdminUser, PermissionAction, PermissionResource } from "./types";

interface AdminAuthValue {
  currentUser: AdminUser | null;
  isReady: boolean;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  can: (resource: PermissionResource, action: PermissionAction) => boolean;
  roleName: string;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);
const SESSION_KEY = "momen.admin.session.v1";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { adminUsers, roles, setAdminUsers } = useAdminStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating session from localStorage on mount
      if (raw) setUserId(JSON.parse(raw).userId ?? null);
    } catch {
      // ignore
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (userId) localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
    else localStorage.removeItem(SESSION_KEY);
  }, [userId, isReady]);

  const currentUser = useMemo(() => adminUsers.find((u) => u.id === userId) ?? null, [adminUsers, userId]);

  const login = useCallback(
    (email: string, password: string): { ok: true } | { ok: false; error: string } => {
      const user = adminUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) return { ok: false, error: "No admin account found with that email." };
      if (user.status === "disabled") return { ok: false, error: "This admin account has been disabled." };
      if (user.demoPassword && user.demoPassword !== password) return { ok: false, error: "Incorrect password." };
      setUserId(user.id);
      setAdminUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, lastLoginAt: new Date().toISOString(), status: "active" } : u)));
      return { ok: true };
    },
    [adminUsers, setAdminUsers]
  );

  const logout = useCallback(() => setUserId(null), []);

  const role = useMemo(() => roles.find((r) => r.id === currentUser?.roleId), [roles, currentUser]);

  const can = useCallback(
    (resource: PermissionResource, action: PermissionAction) => {
      if (!currentUser) return false;
      const actions = role?.permissions[resource];
      return Boolean(actions?.includes(action));
    },
    [currentUser, role]
  );

  const value: AdminAuthValue = { currentUser, isReady, login, logout, can, roleName: role?.name ?? "" };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
