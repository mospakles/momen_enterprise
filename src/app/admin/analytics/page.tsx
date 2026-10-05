"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/lib/orders-context";
import { orderType, isCustomOrder } from "@/lib/order-stages";
import { useAdminStore } from "@/lib/admin/store";
import { formatNaira } from "@/lib/format";
import { buildBuckets, inRange, isRevenueOrder, sumByBucket } from "@/lib/admin/analytics";
import { PageHeader, Card, StatCard, SectionTitle } from "@/components/admin/ui/primitives";
import { LineChart, DonutChart, HorizontalBars } from "@/components/admin/ui/charts";
import { DateRangeFilter, DateRangeKey, rangeFromPreset } from "@/components/admin/ui/FilterBar";
import { exportCsv } from "@/components/admin/ui/DataTable";

export default function AdminAnalyticsPage() {
  const { orders, isReady } = useOrders();
  const { customers, collections: catalogCollections, fabrics } = useAdminStore();
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("30d");
  const [custom, setCustom] = useState<{ from: string; to: string } | undefined>();
  const range = useMemo(() => rangeFromPreset(rangeKey, custom), [rangeKey, custom]);

  const inWindow = useMemo(() => orders.filter((o) => inRange(o.date, range.from, range.to)), [orders, range]);
  const revenueOrders = useMemo(() => inWindow.filter(isRevenueOrder), [inWindow]);

  const metrics = useMemo(() => {
    const revenue = revenueOrders.reduce((s, o) => s + o.total, 0);
    const aov = revenueOrders.length ? revenue / revenueOrders.length : 0;
    const customersByEmail = new Map<string, number>();
    orders.forEach((o) => {
      const key = o.customerEmail ?? o.address.fullName;
      customersByEmail.set(key, (customersByEmail.get(key) ?? 0) + 1);
    });
    const repeatCustomers = [...customersByEmail.values()].filter((n) => n > 1).length;
    const express = inWindow.filter((o) => o.productionSpeed === "express").length;
    const expressPct = inWindow.length ? Math.round((express / inWindow.length) * 100) : 0;

    return { revenue, aov, repeatCustomers, expressPct };
  }, [revenueOrders, inWindow, orders]);

  // Momen-specific breakdowns (Section 21) — product mix, custom order
  // volume, and what customers are actually asking for in the customization
  // wizard, all admin-sourced rather than hardcoded.
  const merch = useMemo(() => {
    const genderSales = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const customizedProducts = new Map<string, number>();
    const customizedFabrics = new Map<string, number>();
    const customizedColours = new Map<string, number>();

    inWindow.forEach((o) => {
      const t = orderType(o.items);
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    });

    revenueOrders.forEach((o) => {
      o.items.forEach((it) => {
        const amount = it.product.price * it.quantity;
        const genderLabel = it.product.gender === "unisex" ? "Unisex" : "Men's";
        genderSales.set(genderLabel, (genderSales.get(genderLabel) ?? 0) + amount);
        if (it.customOrder) {
          customizedProducts.set(it.product.name, (customizedProducts.get(it.product.name) ?? 0) + 1);
          if (it.customOrder.fabricId) {
            const fabricName = fabrics.find((f) => f.id === it.customOrder?.fabricId)?.name ?? it.customOrder.fabricId;
            customizedFabrics.set(fabricName, (customizedFabrics.get(fabricName) ?? 0) + 1);
          }
          if (it.customOrder.primaryColor) {
            customizedColours.set(it.customOrder.primaryColor, (customizedColours.get(it.customOrder.primaryColor) ?? 0) + 1);
          }
        }
      });
    });

    const customOrders = inWindow.filter((o) => isCustomOrder(o.items));
    const resolved = customOrders.filter((o) => ["approved", "awaiting_customer_confirmation", "confirmed", "rejected"].includes(o.customizationStatus ?? ""));
    const approved = resolved.filter((o) => o.customizationStatus !== "rejected");
    const approvalRate = resolved.length ? Math.round((approved.length / resolved.length) * 100) : null;

    return {
      genderSplit: [...genderSales.entries()].map(([label, value]) => ({ label, value })),
      typeSplit: [...typeCounts.entries()].map(([label, value]) => ({ label, value })),
      customizedProductBars: [...customizedProducts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      customizedFabricBars: [...customizedFabrics.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      customizedColourBars: [...customizedColours.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      customOrderCount: customOrders.length,
      approvalRate,
    };
  }, [inWindow, revenueOrders, fabrics]);

  const charts = useMemo(() => {
    const buckets = buildBuckets(range.from, range.to);
    const labels = buckets.map((b) => b.label);
    const revenueSeries = sumByBucket(revenueOrders, (o) => o.date, (o) => o.total, buckets);

    const productPerf = new Map<string, { revenue: number; units: number }>();
    const collectionPerf = new Map<string, number>();
    const locationSales = new Map<string, number>();
    revenueOrders.forEach((o) => {
      locationSales.set(o.address.country, (locationSales.get(o.address.country) ?? 0) + o.total);
      o.items.forEach((it) => {
        const amount = it.product.price * it.quantity;
        const prev = productPerf.get(it.product.name) ?? { revenue: 0, units: 0 };
        productPerf.set(it.product.name, { revenue: prev.revenue + amount, units: prev.units + it.quantity });
        const collectionName = catalogCollections.find((c) => c.slug === it.product.collectionSlugs[0])?.name ?? "Uncategorized";
        collectionPerf.set(collectionName, (collectionPerf.get(collectionName) ?? 0) + amount);
      });
    });

    return {
      labels,
      revenueSeries,
      productBars: [...productPerf.entries()].map(([label, v]) => ({ label, value: v.revenue })).sort((a, b) => b.value - a.value).slice(0, 8),
      collectionBars: [...collectionPerf.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      locationBars: [...locationSales.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8),
    };
  }, [revenueOrders, inWindow, range, catalogCollections]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Deep performance metrics for the selected period."
        actions={
          <>
            <DateRangeFilter value={rangeKey} onChange={(k, c) => { setRangeKey(k); setCustom(c); }} />
            <button
              onClick={() =>
                exportCsv(
                  "analytics-products.csv",
                  [
                    { key: "label", label: "Product", render: () => null, csvValue: (r: { label: string; value: number }) => r.label },
                    { key: "value", label: "Revenue", render: () => null, csvValue: (r: { label: string; value: number }) => r.value },
                  ],
                  charts.productBars
                )
              }
              className="border border-line px-3.5 py-2.5 text-xs hover:border-brass"
            >
              Export CSV
            </button>
          </>
        }
      />

      {!isReady ? (
        <p className="text-sm text-ink/50">Loading analytics…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue" value={formatNaira(metrics.revenue)} />
            <StatCard label="Orders" value={inWindow.length} />
            <StatCard label="Average Order Value" value={formatNaira(Math.round(metrics.aov))} />
            <StatCard label="Customers" value={customers.length} />
            <StatCard label="Repeat Customers" value={metrics.repeatCustomers} />
            <StatCard label="Express Order %" value={`${metrics.expressPct}%`} />
            <StatCard label="Custom Orders" value={merch.customOrderCount} />
            <StatCard label="Custom Order Approval Rate" value={merch.approvalRate === null ? "—" : `${merch.approvalRate}%`} />
          </div>

          <Card>
            <SectionTitle>Revenue Trend</SectionTitle>
            <LineChart labels={charts.labels} series={[{ label: "Revenue", values: charts.revenueSeries, color: "#A3803E" }]} formatValue={formatNaira} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle>Product Performance</SectionTitle>
              <HorizontalBars data={charts.productBars} formatValue={formatNaira} />
            </Card>
            <Card>
              <SectionTitle>Collection Performance</SectionTitle>
              <HorizontalBars data={charts.collectionBars} formatValue={formatNaira} />
            </Card>
            <Card>
              <SectionTitle>Sales by Location</SectionTitle>
              <HorizontalBars data={charts.locationBars} formatValue={formatNaira} />
            </Card>
          </div>

          <SectionTitle>Made-to-Measure &amp; Customization</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle>Sales by Gender</SectionTitle>
              <DonutChart data={merch.genderSplit} formatValue={formatNaira} />
            </Card>
            <Card>
              <SectionTitle>Orders by Type (RTW / MTM / Custom / Accessory)</SectionTitle>
              <DonutChart data={merch.typeSplit} />
            </Card>
            <Card>
              <SectionTitle>Most Customized Products</SectionTitle>
              {merch.customizedProductBars.length > 0 ? (
                <HorizontalBars data={merch.customizedProductBars} />
              ) : (
                <p className="text-sm text-ink/40">No custom orders in this period.</p>
              )}
            </Card>
            <Card>
              <SectionTitle>Most-Selected Fabrics</SectionTitle>
              {merch.customizedFabricBars.length > 0 ? (
                <HorizontalBars data={merch.customizedFabricBars} />
              ) : (
                <p className="text-sm text-ink/40">No custom orders in this period.</p>
              )}
            </Card>
            <Card>
              <SectionTitle>Most-Selected Colours</SectionTitle>
              {merch.customizedColourBars.length > 0 ? (
                <HorizontalBars data={merch.customizedColourBars} />
              ) : (
                <p className="text-sm text-ink/40">No custom orders in this period.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
