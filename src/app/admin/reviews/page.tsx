"use client";

import { useCallback, useMemo, useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import type { Review, ReviewStatus } from "@/lib/admin/types";
import { PageHeader, Card, StatCard, StatusPill, Drawer, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { TextareaField } from "@/components/admin/ui/form";

function Stars({ rating }: { rating: number }) {
  return <span className="text-brass">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

export default function AdminReviewsPage() {
  const { reviews, products, updateReviewStatus, toggleReviewFeatured, respondToReview, deleteReview } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [ratingFilter, setRatingFilter] = useState<"all" | string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState("");

  const productName = useCallback((id: string) => products.find((p) => p.id === id)?.name ?? "Unknown product", [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (q && !(r.customerName.toLowerCase().includes(q) || productName(r.productId).toLowerCase().includes(q) || r.body.toLowerCase().includes(q))) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (ratingFilter !== "all" && r.rating !== Number(ratingFilter)) return false;
      return true;
    });
  }, [reviews, search, statusFilter, ratingFilter, productName]);

  const kpis = useMemo(
    () => ({
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      avgRating: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—",
      featured: reviews.filter((r) => r.featured).length,
    }),
    [reviews]
  );

  const open = reviews.find((r) => r.id === openId);

  const columns: Column<Review>[] = [
    { key: "product", label: "Product", render: (r) => productName(r.productId), csvValue: (r) => productName(r.productId) },
    { key: "customer", label: "Customer", render: (r) => r.customerName, sortValue: (r) => r.customerName, csvValue: (r) => r.customerName },
    { key: "rating", label: "Rating", render: (r) => <Stars rating={r.rating} />, sortValue: (r) => r.rating, csvValue: (r) => r.rating },
    { key: "body", label: "Review", render: (r) => <span className="line-clamp-1 max-w-[260px] text-ink/70">{r.body}</span>, csvValue: (r) => r.body },
    { key: "status", label: "Status", render: (r) => <StatusPill status={r.status} />, sortValue: (r) => r.status, csvValue: (r) => r.status },
    { key: "featured", label: "Featured", render: (r) => (r.featured ? "Yes" : "—"), csvValue: (r) => (r.featured ? "Yes" : "No") },
    { key: "date", label: "Date", render: (r) => formatDate(r.date), sortValue: (r) => r.date, csvValue: (r) => formatDate(r.date) },
  ];

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate, feature, and respond to customer reviews." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Moderation" value={kpis.pending} />
        <StatCard label="Approved" value={kpis.approved} />
        <StatCard label="Average Rating" value={kpis.avgRating} />
        <StatCard label="Featured" value={kpis.featured} />
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search customer, product, review…" />
        <FilterSelect ariaLabel="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }]} />
        <FilterSelect ariaLabel="Rating" value={ratingFilter} onChange={setRatingFilter} options={[{ value: "all", label: "All Ratings" }, { value: "5", label: "5 Stars" }, { value: "4", label: "4 Stars" }, { value: "3", label: "3 Stars" }, { value: "2", label: "2 Stars" }, { value: "1", label: "1 Star" }]} />
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(r) => r.id} emptyTitle="No reviews match these filters" pageSize={12} onRowClick={(r) => { setOpenId(r.id); setResponseDraft(""); }} />

      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={`${open.customerName} on ${productName(open.productId)}`}>
          <div className="mb-3 flex items-center gap-2">
            <Stars rating={open.rating} />
            <StatusPill status={open.status} />
          </div>
          <Card>
            {open.title && <p className="mb-1.5 font-medium">{open.title}</p>}
            <p className="text-sm text-ink/70">{open.body}</p>
            <p className="mt-2 text-xs text-ink/40">{formatDate(open.date)} · {open.customerEmail}</p>
          </Card>

          {open.response && (
            <Card className="mt-3">
              <p className="eyebrow mb-1.5">Store Response</p>
              <p className="text-sm text-ink/70">{open.response.message}</p>
              <p className="mt-1 text-xs text-ink/40">{formatDate(open.response.date)}</p>
            </Card>
          )}

          {can("reviews", "approve") && (
            <div className="mt-4 flex flex-wrap gap-2">
              {open.status !== "approved" && (
                <button
                  onClick={() => {
                    updateReviewStatus(open.id, "approved");
                    audit("review.approved", "reviews", `Approved review from ${open.customerName}.`, { resourceId: open.id });
                  }}
                  className="border border-line px-3 py-1.5 text-xs hover:border-brass"
                >
                  Approve
                </button>
              )}
              {open.status !== "rejected" && (
                <button
                  onClick={() => {
                    updateReviewStatus(open.id, "rejected");
                    audit("review.rejected", "reviews", `Rejected review from ${open.customerName}.`, { resourceId: open.id });
                  }}
                  className="border border-line px-3 py-1.5 text-xs hover:border-brass"
                >
                  Reject
                </button>
              )}
              <button
                onClick={() => {
                  toggleReviewFeatured(open.id);
                  audit("review.featured_toggled", "reviews", `${open.featured ? "Unfeatured" : "Featured"} review from ${open.customerName}.`, { resourceId: open.id });
                }}
                className="border border-line px-3 py-1.5 text-xs hover:border-brass"
              >
                {open.featured ? "Unfeature" : "Feature"}
              </button>
              <button onClick={() => setConfirmDelete(open.id)} className="border border-error/40 px-3 py-1.5 text-xs text-error hover:bg-error/5">
                Delete
              </button>
            </div>
          )}

          {can("reviews", "edit") && (
            <div className="mt-5">
              <TextareaField label="Respond to this review" value={responseDraft} onChange={setResponseDraft} rows={2} />
              <button
                onClick={() => {
                  if (responseDraft.trim()) {
                    respondToReview(open.id, responseDraft.trim());
                    audit("review.responded", "reviews", `Responded to review from ${open.customerName}.`, { resourceId: open.id });
                    setResponseDraft("");
                  }
                }}
                className="mt-2 border border-line px-3 py-1.5 text-xs hover:border-brass"
              >
                Post Response
              </button>
            </div>
          )}
        </Drawer>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteReview(confirmDelete);
            audit("review.deleted", "reviews", "Deleted a review.", { resourceId: confirmDelete });
          }
          setOpenId(null);
        }}
        title="Delete this review?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
