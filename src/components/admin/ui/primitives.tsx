"use client";

import { useEffect } from "react";
import Link from "next/link";
import { STATUS, statusRole } from "./chart-palette";
import { Sparkline } from "./charts";

/* ─────────────────────────────── Layout bits ─────────────────────────────── */

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-ink/40">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {b.href ? (
                  <Link href={b.href} className="hover:text-brass">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink/60">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-2xl sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink/55">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", padded = true }: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return <div className={`border border-line bg-ivory ${padded ? "p-5" : ""} ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="eyebrow">{children}</p>
      {action}
    </div>
  );
}

/* ─────────────────────────────── Status pill ─────────────────────────────── */
// Never color-alone: every pill pairs a status dot with the text label
// itself, per the dataviz skill's status-palette rule.

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const role = statusRole(status);
  const color = STATUS[role];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ivory-deep/40 px-2.5 py-1 text-[11px] font-medium text-ink/75">
      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {label ?? status}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brass" | "error" }) {
  const tones = {
    neutral: "border-line text-ink/60",
    brass: "border-brass/50 text-brass bg-brass/5",
    error: "border-error/40 text-error bg-error/5",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}>{children}</span>;
}

/* ─────────────────────────────── Stat card ─────────────────────────────── */

export function StatCard({
  label,
  value,
  delta,
  trend,
  href,
}: {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean };
  trend?: number[];
  href?: string;
}) {
  const content = (
    <Card className="h-full transition-colors hover:border-brass/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink/50">{label}</p>
          <p className="mt-1.5 font-display text-2xl">{value}</p>
          {delta && (
            <p className={`mt-1 text-xs ${delta.positive ? "text-[#006300]" : "text-error"}`}>
              {delta.positive ? "↑" : "↓"} {delta.value}
            </p>
          )}
        </div>
        {trend && trend.length > 1 && <Sparkline values={trend} />}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

/* ─────────────────────────────── Empty / loading states ─────────────────────────────── */

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-lg text-ink/70">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink/45">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-sm bg-ivory-deep ${className}`} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────── Pagination ─────────────────────────────── */

export function Pagination({
  page,
  pageCount,
  onChange,
  total,
  pageSize,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}) {
  if (pageCount <= 1) return null;
  const from = total !== undefined && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to = total !== undefined && pageSize ? Math.min(page * pageSize, total) : undefined;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink/50">
      {total !== undefined ? (
        <p>
          {from}–{to} of {total}
        </p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="border border-line px-2.5 py-1.5 hover:border-brass hover:text-brass disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink/50"
        >
          Prev
        </button>
        <span className="px-2">
          Page {page} of {pageCount}
        </span>
        <button
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="border border-line px-2.5 py-1.5 hover:border-brass hover:text-brass disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink/50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Tabs ─────────────────────────────── */

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm ${
            active === t.key ? "border-brass font-medium text-ink" : "border-transparent text-ink/50 hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-xs text-ink/35">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────── Modal / Drawer / Confirm ─────────────────────────────── */

function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  useEscapeKey(onClose);
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div
        className={`fade-up max-h-[85vh] w-full overflow-y-auto border border-line bg-ivory p-6 ${widths[size]}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink/50 hover:text-ink">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEscapeKey(onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-ink/50" onClick={onClose}>
      <div
        className={`h-full w-full overflow-y-auto bg-ivory p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink/50 hover:text-ink">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {description && <p className="text-sm text-ink/60">{description}</p>}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-5 py-2.5 text-sm font-medium text-ivory ${danger ? "bg-error hover:bg-error/85" : "bg-ink hover:bg-brass"}`}
        >
          {confirmLabel}
        </button>
        <button onClick={onClose} className="border border-ink px-5 py-2.5 text-sm hover:border-brass hover:text-brass">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────── Toolbar (bulk actions) ─────────────────────────────── */

export function BulkToolbar({ count, children, onClear }: { count: number; children: React.ReactNode; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-ivory-deep/40 px-4 py-2.5 text-sm">
      <span className="font-medium">{count} selected</span>
      <div className="flex flex-wrap gap-2">{children}</div>
      <button onClick={onClear} className="ml-auto text-xs text-ink/40 hover:text-ink">
        Clear
      </button>
    </div>
  );
}
