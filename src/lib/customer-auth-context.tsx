"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Customer } from "./admin/types";
import { ApiError, apiRequest, notifyAuthChanged } from "./api";

type AuthResult = { ok: true } | { ok: false; error: string };

interface CustomerAuthValue {
  currentUser: Customer | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (input: { name: string; email: string; password: string; phone?: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Customer, "name" | "email" | "phone">>) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      setCurrentUser(await apiRequest<Customer>("/auth/me"));
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refreshProfile().catch(() => setCurrentUser(null)).finally(() => active && setIsReady(true));
    return () => { active = false; };
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      await apiRequest("/auth/login", { method: "POST", body: { email, password }, skipRefresh: true });
      await refreshProfile();
      notifyAuthChanged();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  }, [refreshProfile]);

  const signup = useCallback(async (input: { name: string; email: string; password: string; phone?: string }): Promise<AuthResult> => {
    try {
      await apiRequest("/auth/signup", { method: "POST", body: input, skipRefresh: true });
      await refreshProfile();
      notifyAuthChanged();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    await apiRequest("/auth/logout", { method: "POST", body: {}, skipRefresh: true }).catch(() => undefined);
    setCurrentUser(null);
    notifyAuthChanged();
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Pick<Customer, "name" | "email" | "phone">>): Promise<AuthResult> => {
    try {
      const saved = await apiRequest<Customer>("/auth/me", { method: "PATCH", body: patch });
      setCurrentUser(saved);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  }, []);

  const value = useMemo<CustomerAuthValue>(
    () => ({ currentUser, isReady, login, signup, logout, updateProfile, refreshProfile }),
    [currentUser, isReady, login, signup, logout, updateProfile, refreshProfile],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
