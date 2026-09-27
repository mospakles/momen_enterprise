"use client";

// Generic, reusable admin table: client-side sorting, pagination, column
// visibility, row selection (for bulk actions), and CSV export. Filtering
// and search stay in the parent (via `FilterBar`) since filter shape differs
// per module — this component only needs the already-filtered row set.

import { useMemo, useState } from "react";
import { EmptyState, Pagination, TableSkeleton } from "./primitives";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  hideByDefault?: boolean;
  csvValue?: (row: T) => string | number;
}

export function exportCsv<T>(filename: string, columns: Column<T>[], rows: T[]) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = c.csvValue ? c.csvValue(row) : "";
          return `"${String(raw).replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  pageSize = 10,
  selectable = false,
  selectedIds,
  onSelectChange,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.hideByDefault).map((c) => c.key))
  );
  const [showColMenu, setShowColMenu] = useState(false);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.key));

  function toggleSort(key: string) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  function toggleAll() {
    if (!onSelectChange) return;
    const allIds = pageRows.map(getRowId);
    const allSelected = allIds.every((id) => selectedIds?.has(id));
    const next = new Set(selectedIds);
    if (allSelected) allIds.forEach((id) => next.delete(id));
    else allIds.forEach((id) => next.add(id));
    onSelectChange(next);
  }

  function toggleOne(id: string) {
    if (!onSelectChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectChange(next);
  }

  if (loading) {
    return (
      <div className="border border-line bg-ivory">
        <TableSkeleton />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border border-line bg-ivory">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="border border-line bg-ivory">
      <div className="flex items-center justify-end gap-2 border-b border-line px-3 py-2">
        <div className="relative">
          <button onClick={() => setShowColMenu((s) => !s)} className="eyebrow text-ink/50 hover:text-brass">
            Columns
          </button>
          {showColMenu && (
            <div className="absolute right-0 z-10 mt-2 w-48 border border-line bg-ivory p-2 shadow-lg">
              {columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-ivory-deep/40">
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(c.key)}
                    onChange={() =>
                      setHiddenCols((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.key)) next.delete(c.key);
                        else next.add(c.key);
                        return next;
                      })
                    }
                    className="accent-brass"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => exportCsv("export.csv", visibleColumns, sorted)} className="eyebrow text-ink/50 hover:text-brass">
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink/40">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selectedIds?.has(getRowId(r)))}
                    onChange={toggleAll}
                    className="accent-brass"
                  />
                </th>
              )}
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 font-normal ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${
                    c.sortValue ? "cursor-pointer select-none hover:text-ink" : ""
                  }`}
                  onClick={() => c.sortValue && toggleSort(c.key)}
                >
                  {c.label}
                  {sort?.key === c.key && <span className="ml-1">{sort.dir === 1 ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  className={`border-b border-line last:border-0 ${onRowClick ? "cursor-pointer hover:bg-ivory-deep/30" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={Boolean(selectedIds?.has(id))} onChange={() => toggleOne(id)} className="accent-brass" />
                    </td>
                  )}
                  {visibleColumns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={clampedPage} pageCount={pageCount} onChange={setPage} total={sorted.length} pageSize={pageSize} />
    </div>
  );
}
