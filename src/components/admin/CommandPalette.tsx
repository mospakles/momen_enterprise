"use client";

// Global admin search (⌘K / Ctrl+K). Searches across orders, customers,
// products, collections, and coupons, and jumps straight to the record —
// e.g. typing an order number takes the admin straight to that order.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrders } from "@/lib/orders-context";
import { useAdminStore } from "@/lib/admin/store";
import { formatNaira } from "@/lib/format";
import { Icon } from "@/components/admin/ui/icons";

interface Hit {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { orders } = useOrders();
  const { products, collections, customers, coupons } = useAdminStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hits: Hit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: Hit[] = [];

    orders
      .filter((o) => o.id.toLowerCase().includes(q) || o.address.fullName.toLowerCase().includes(q) || o.customerEmail?.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((o) => results.push({ id: o.id, type: "Order", title: o.id, subtitle: `${o.address.fullName} · ${formatNaira(o.total)}`, href: `/admin/orders?open=${o.id}` }));

    customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((c) => results.push({ id: c.id, type: "Customer", title: c.name, subtitle: c.email, href: `/admin/customers?open=${c.id}` }));

    products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((p) => results.push({ id: p.id, type: "Product", title: p.name, subtitle: `${p.sku} · ${formatNaira(p.price)}`, href: `/admin/products?open=${p.id}` }));

    collections
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) => results.push({ id: c.id, type: "Collection", title: c.name, subtitle: `/collections/${c.slug}`, href: `/admin/collections?open=${c.id}` }));

    coupons
      .filter((c) => c.code.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) => results.push({ id: c.id, type: "Coupon", title: c.code, subtitle: c.type === "percentage" ? `${c.value}% off` : formatNaira(c.value), href: `/admin/coupons?open=${c.id}` }));

    return results.slice(0, 16);
  }, [query, orders, customers, products, collections, coupons]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/50 px-4 pt-[12vh]" onClick={onClose}>
      <div className="fade-up w-full max-w-xl border border-line bg-ivory shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Icon name="search" className="h-4 w-4 text-ink/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, customers, products, collections, coupons…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
          />
          <kbd className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-ink/40">Esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() === "" ? (
            <p className="px-4 py-8 text-center text-sm text-ink/40">Start typing to search the whole dashboard.</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink/40">No results for &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul>
              {hits.map((h) => (
                <li key={`${h.type}-${h.id}`}>
                  <button
                    onClick={() => {
                      router.push(h.href);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-ivory-deep/50"
                  >
                    <span>
                      <span className="font-medium">{h.title}</span>
                      <span className="ml-2 text-xs text-ink/45">{h.subtitle}</span>
                    </span>
                    <span className="eyebrow shrink-0 text-ink/30">{h.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
