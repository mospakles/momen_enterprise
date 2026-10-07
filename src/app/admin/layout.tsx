"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin/auth-context";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import CommandPalette from "@/components/admin/CommandPalette";

const SIDEBAR_KEY = "momen.admin.sidebar-collapsed.v1";

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isReady } = useAdminAuth();
  // Lazy initializer (not an effect) — safe because the whole shell renders
  // a loading screen until auth resolves anyway, so there's no pre-hydration
  // flash of the wrong sidebar width to reconcile.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      return raw ? Boolean(JSON.parse(raw)) : false;
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isPublicAuthRoute = [
    "/admin/login",
    "/admin/forgot-password",
    "/admin/reset-password",
  ].includes(pathname);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isReady && !currentUser && !isPublicAuthRoute) router.replace("/admin/login");
  }, [isReady, currentUser, isPublicAuthRoute, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (isPublicAuthRoute) return <>{children}</>;

  if (!isReady || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-sm text-ivory/40">Loading admin…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ivory-deep/30">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSearch={() => setSearchOpen(true)} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {/* Keyed by open-state so the query input always starts fresh — avoids
          needing an effect to reset internal state on open/close. */}
      <CommandPalette key={searchOpen ? "open" : "closed"} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
