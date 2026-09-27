"use client";

// Mock storefront authentication for customers — the same pattern as
// `@/lib/admin/auth-context`, just pointed at the CRM `customers` slice of
// `AdminStoreProvider` instead of `adminUsers`. That's deliberate: a real
// customer who places an order becomes a CRM record either way, so signing
// up here and appearing in /admin/customers is the same person, not two
// systems to reconcile later.
//
// `login()`/`signup()` become real API calls, the session becomes a signed
// cookie/JWT instead of localStorage, and `demoPassword` disappears from the
// `Customer` type entirely (server-side password hashing only). Nothing here
// should be mistaken for production security — see the disclaimer surfaced
// on the login/signup pages themselves.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAdminStore } from "./admin/store";
import type { Customer } from "./admin/types";

type AuthResult = { ok: true } | { ok: false; error: string };

interface CustomerAuthValue {
  currentUser: Customer | null;
  isReady: boolean;
  login: (email: string, password: string) => AuthResult;
  signup: (input: { name: string; email: string; password: string; phone?: string }) => AuthResult;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<Customer, "name" | "email" | "phone">>) => void;
}

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);
const SESSION_KEY = "momen.customer.session.v1";

function genId() {
  return `cus-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const { customers, setCustomers } = useAdminStore();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating session from localStorage on mount
      if (raw) setCustomerId(JSON.parse(raw).customerId ?? null);
    } catch {
      // ignore corrupt session, fall back to logged-out
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (customerId) localStorage.setItem(SESSION_KEY, JSON.stringify({ customerId }));
    else localStorage.removeItem(SESSION_KEY);
  }, [customerId, isReady]);

  const currentUser = useMemo(() => customers.find((c) => c.id === customerId) ?? null, [customers, customerId]);

  const login = useCallback(
    (email: string, password: string): AuthResult => {
      const user = customers.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) return { ok: false, error: "No account found with that email." };
      if (user.status === "disabled") return { ok: false, error: "This account has been disabled. Contact support for help." };
      if (!user.demoPassword) return { ok: false, error: "This account has no password set — try signing up again or contact support." };
      if (user.demoPassword !== password) return { ok: false, error: "Incorrect password." };
      setCustomerId(user.id);
      setCustomers((prev) => prev.map((c) => (c.id === user.id ? { ...c, lastLoginAt: new Date().toISOString() } : c)));
      return { ok: true };
    },
    [customers, setCustomers]
  );

  const signup = useCallback(
    ({ name, email, password, phone }: { name: string; email: string; password: string; phone?: string }): AuthResult => {
      const trimmedEmail = email.trim().toLowerCase();
      if (!name.trim()) return { ok: false, error: "Enter your name." };
      if (!trimmedEmail) return { ok: false, error: "Enter your email." };
      if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
      if (customers.some((c) => c.email.toLowerCase() === trimmedEmail)) {
        return { ok: false, error: "An account with that email already exists — try signing in instead." };
      }
      const newCustomer: Customer = {
        id: genId(),
        name: name.trim(),
        email: trimmedEmail,
        phone,
        status: "active",
        createdAt: new Date().toISOString(),
        addresses: [],
        tags: [],
        marketingOptIn: true,
        notes: [],
        demoPassword: password,
        lastLoginAt: new Date().toISOString(),
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      setCustomerId(newCustomer.id);
      return { ok: true };
    },
    [customers, setCustomers]
  );

  const logout = useCallback(() => setCustomerId(null), []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<Customer, "name" | "email" | "phone">>) => {
      if (!customerId) return;
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, ...patch } : c)));
    },
    [customerId, setCustomers]
  );

  const value: CustomerAuthValue = { currentUser, isReady, login, signup, logout, updateProfile };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
