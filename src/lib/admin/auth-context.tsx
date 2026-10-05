"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest, notifyAuthChanged } from "@/lib/api";
import type { AdminUser, PermissionAction, PermissionResource } from "./types";

type SessionAdmin = AdminUser & {
  roleName: string;
  permissions: string[];
};

type AuthResult = { ok: true } | { ok: false; error: string };

interface AdminAuthValue {
  currentUser: SessionAdmin | null;
  isReady: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  can: (resource: PermissionResource, action: PermissionAction) => boolean;
  roleName: string;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionAdmin | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      setCurrentUser(await apiRequest<SessionAdmin>("/admin/auth/me"));
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refreshProfile()
      .catch(() => setCurrentUser(null))
      .finally(() => active && setIsReady(true));
    return () => {
      active = false;
    };
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string, twoFactorCode?: string): Promise<AuthResult> => {
      try {
        await apiRequest("/admin/auth/login", {
          method: "POST",
          body: { email, password, ...(twoFactorCode ? { twoFactorCode } : {}) },
          skipRefresh: true,
        });
        await refreshProfile();
        notifyAuthChanged();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [refreshProfile],
  );

  const logout = useCallback(async () => {
    await apiRequest("/admin/auth/logout", { method: "POST", body: {}, skipRefresh: true }).catch(() => undefined);
    setCurrentUser(null);
    notifyAuthChanged();
  }, []);

  const can = useCallback(
    (resource: PermissionResource, action: PermissionAction) =>
      Boolean(currentUser?.permissions.includes(`${resource}:${action}`)),
    [currentUser],
  );

  const value = useMemo<AdminAuthValue>(
    () => ({
      currentUser,
      isReady,
      login,
      logout,
      refreshProfile,
      can,
      roleName: currentUser?.roleName ?? "",
    }),
    [currentUser, isReady, login, logout, refreshProfile, can],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return context;
}
