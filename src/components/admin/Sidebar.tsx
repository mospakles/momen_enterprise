"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { Icon } from "@/components/admin/ui/icons";

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { currentUser, roleName, can, logout } = useAdminAuth();

  const content = (
    <div className="flex h-full flex-col bg-ink text-ivory">
      <div className={`flex items-center gap-2 border-b border-ivory/10 px-4 py-4 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <Link href="/admin" className="font-display text-lg">
            Momen <span className="text-brass-light">Admin</span>
          </Link>
        )}
        {collapsed && <span className="font-display text-lg text-brass-light">M</span>}
        <button
          onClick={onToggle}
          className="hidden shrink-0 rounded-sm p-1.5 text-ivory/50 hover:bg-ivory/10 hover:text-ivory lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronLeft"} className="h-4 w-4" />
        </button>
        <button onClick={onCloseMobile} className="rounded-sm p-1.5 text-ivory/50 hover:bg-ivory/10 hover:text-ivory lg:hidden" aria-label="Close menu">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {ADMIN_NAV.map((group) => {
          const visibleItems = group.items.filter((item) => !item.resource || can(item.resource, "view"));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              {!collapsed && <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ivory/35">{group.label}</p>}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] transition-colors ${
                          active ? "bg-brass/15 text-brass-light" : "text-ivory/65 hover:bg-ivory/5 hover:text-ivory"
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className={`border-t border-ivory/10 p-3 ${collapsed ? "flex flex-col items-center gap-2" : ""}`}>
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="truncate text-sm text-ivory">{currentUser?.name ?? "Guest"}</p>
              <p className="truncate text-[11px] text-ivory/40">{roleName}</p>
            </div>
            <button onClick={logout} title="Log out" className="shrink-0 rounded-sm p-1.5 text-ivory/40 hover:bg-ivory/10 hover:text-ivory">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={logout} title="Log out" className="rounded-sm p-1.5 text-ivory/40 hover:bg-ivory/10 hover:text-ivory">
            <Icon name="logout" className="h-4 w-4" />
          </button>
        )}
        <Link href="/" className={`mt-2 flex items-center gap-2 px-1 text-[11px] text-ivory/40 hover:text-ivory ${collapsed ? "justify-center" : ""}`}>
          <Icon name="home" className="h-3.5 w-3.5" />
          {!collapsed && "Back to store"}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden shrink-0 transition-all duration-200 lg:block ${collapsed ? "w-[64px]" : "w-[248px]"}`}>{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={onCloseMobile} />
          <div className="absolute inset-y-0 left-0 w-[260px]">{content}</div>
        </div>
      )}
    </>
  );
}
