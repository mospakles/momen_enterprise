"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_NAV_LEAVES } from "@/lib/admin/nav";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminStore } from "@/lib/admin/store";
import { useOrders } from "@/lib/orders-context";
import { Icon } from "@/components/admin/ui/icons";

export default function Topbar({ onOpenSearch, onOpenMobileNav }: { onOpenSearch: () => void; onOpenMobileNav: () => void }) {
  const pathname = usePathname();
  const { currentUser, roleName, logout } = useAdminAuth();
  const { products, refunds } = useAdminStore();
  const { orders } = useOrders();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const current = ALL_NAV_LEAVES.find((l) => (l.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(l.href)));

  const alerts = useMemo(() => {
    const list: { label: string; href: string; tone: "warning" | "critical" }[] = [];
    const lowStock = products.filter((p) => p.stock === "low-stock" || (p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold));
    const outOfStock = products.filter((p) => p.stock === "out-of-stock" || p.stockQuantity === 0);
    if (outOfStock.length) list.push({ label: `${outOfStock.length} product${outOfStock.length > 1 ? "s" : ""} out of stock`, href: "/admin/inventory", tone: "critical" });
    if (lowStock.length) list.push({ label: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low`, href: "/admin/inventory", tone: "warning" });
    const pendingRefunds = refunds.filter((r) => r.status === "requested");
    if (pendingRefunds.length) list.push({ label: `${pendingRefunds.length} refund request${pendingRefunds.length > 1 ? "s" : ""} awaiting review`, href: "/admin/refunds", tone: "warning" });
    const overdue = orders.filter((o) => {
      if (!o.production?.expectedCompletionDate) return false;
      const isOpen = o.status && !["Delivered", "Cancelled", "Refunded"].includes(o.status);
      return isOpen && new Date(o.production.expectedCompletionDate) < new Date();
    });
    if (overdue.length) list.push({ label: `${overdue.length} order${overdue.length > 1 ? "s" : ""} overdue in production`, href: "/admin/production", tone: "critical" });
    return list;
  }, [products, refunds, orders]);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-ivory px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onOpenMobileNav} className="rounded-sm p-1.5 text-ink/60 hover:bg-ivory-deep/60 lg:hidden" aria-label="Open menu">
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <nav className="flex items-center gap-1.5 text-[11px] text-ink/35">
            <span>Admin</span>
            {current && current.href !== "/admin" && (
              <>
                <span>/</span>
                <span className="text-ink/55">{current.label}</span>
              </>
            )}
          </nav>
          <h1 className="truncate font-display text-lg leading-tight">{current?.label ?? "Dashboard"}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onOpenSearch}
          className="hidden items-center gap-2 border border-line px-3 py-2 text-xs text-ink/45 hover:border-brass sm:flex"
        >
          <Icon name="search" className="h-3.5 w-3.5" />
          Search…
          <kbd className="ml-2 rounded-sm border border-line bg-ivory-deep/50 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        <button onClick={onOpenSearch} className="p-2 text-ink/60 hover:text-brass sm:hidden" aria-label="Search">
          <Icon name="search" className="h-5 w-5" />
        </button>

        <div className="relative">
          <button onClick={() => setNotifOpen((s) => !s)} className="relative p-2 text-ink/60 hover:text-brass" aria-label="Notifications">
            <Icon name="bell" className="h-5 w-5" />
            {alerts.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-error" />}
          </button>
          {notifOpen && (
            <div className="absolute right-0 z-30 mt-2 w-72 border border-line bg-ivory shadow-lg">
              <p className="border-b border-line px-3.5 py-2.5 text-xs font-medium text-ink/60">Alerts</p>
              {alerts.length === 0 ? (
                <p className="px-3.5 py-6 text-center text-xs text-ink/40">All clear — nothing needs attention.</p>
              ) : (
                <ul>
                  {alerts.map((a, i) => (
                    <li key={i}>
                      <Link href={a.href} onClick={() => setNotifOpen(false)} className="flex items-center gap-2 px-3.5 py-2.5 text-xs hover:bg-ivory-deep/40">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.tone === "critical" ? "bg-error" : "bg-brass"}`} />
                        {a.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setUserOpen((s) => !s)} className="flex items-center gap-2 border border-transparent px-2 py-1.5 hover:border-line">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-medium text-ivory">
              {currentUser?.name?.[0] ?? "?"}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium leading-tight">{currentUser?.name}</span>
              <span className="block text-[10px] text-ink/40 leading-tight">{roleName}</span>
            </span>
          </button>
          {userOpen && (
            <div className="absolute right-0 z-30 mt-2 w-48 border border-line bg-ivory shadow-lg">
              <Link href="/admin/settings" onClick={() => setUserOpen(false)} className="block px-3.5 py-2.5 text-sm hover:bg-ivory-deep/40">
                Account settings
              </Link>
              <Link href="/" className="block px-3.5 py-2.5 text-sm hover:bg-ivory-deep/40">
                View storefront
              </Link>
              <button onClick={logout} className="block w-full px-3.5 py-2.5 text-left text-sm text-error hover:bg-error/5">
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
