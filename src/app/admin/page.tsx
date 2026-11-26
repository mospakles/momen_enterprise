"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/lib/orders-context";
import { useAdminStore } from "@/lib/admin/store";
import { formatNaira } from "@/lib/format";
import { buildBuckets, countByBucket, cumulativeByBucket, inRange, isRevenueOrder, isSameDay, isSameMonth, sumByBucket } from "@/lib/admin/analytics";
import { DateRangeFilter, DateRangeKey, rangeFromPreset } from "@/components/admin/ui/FilterBar";
import { PageHeader, StatCard, Card, SectionTitle } from "@/components/admin/ui/primitives";
import { LineChart, DonutChart, HorizontalBars } from "@/components/admin/ui/charts";
import { STATUS, statusRole } from "@/components/admin/ui/chart-palette";

export default function AdminDashboard() {
  const { orders, isReady: ordersReady } = useOrders();
  const { products, customers, collections: catalogCollections, isReady: storeReady } = useAdminStore();
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("30d");
  const [custom, setCustom] = useState<{ from: string; to: string } | undefined>();
  const range = useMemo(() => rangeFromPreset(rangeKey, custom), [rangeKey, custom]);

  const isReady = ordersReady && storeReady;

  const stats = useMemo(() => {
    const revenueOrders = orders.filter(isRevenueOrder);
    const totalRevenue = revenueOrders.reduce((s, o) => s + o.total, 0);
    const today = new Date();
    const revenueToday = revenueOrders.filter((o) => isSameDay(new Date(o.date), today)).reduce((s, o) => s + o.total, 0);
    const revenueThisMonth = revenueOrders.filter((o) => isSameMonth(new Date(o.date), today)).reduce((s, o) => s + o.total, 0);

    const inProd = ["Production Queue", "In Production", "Quality Check"];
    const ordersByCustomer = new Map<string, number>();
    orders.forEach((o) => {
      const key = o.customerEmail ?? o.address.fullName;
      ordersByCustomer.set(key, (ordersByCustomer.get(key) ?? 0) + 1);
    });

    return {
      totalRevenue,
      revenueToday,
      revenueThisMonth,
      totalOrders: orders.length,
      newOrders: orders.filter((o) => inRange(o.date, range.from, range.to)).length,
      ordersInProduction: orders.filter((o) => inProd.includes(o.status ?? "")).length,
      awaitingMeasurements: orders.filter((o) => o.status === "Awaiting Measurements").length,
      readyForDispatch: orders.filter((o) => o.status === "Ready for Dispatch").length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
      cancelled: orders.filter((o) => o.status === "Cancelled").length,
      pendingPayments: orders.filter((o) => o.paymentStatus === "pending").length,
      failedPayments: orders.filter((o) => o.paymentStatus === "failed").length,
      refundedPayments: orders.filter((o) => o.paymentStatus === "refunded" || o.paymentStatus === "partially_refunded").length,
      expressOrders: orders.filter((o) => o.productionSpeed === "express").length,
      standardOrders: orders.filter((o) => o.productionSpeed === "standard").length,
      totalCustomers: customers.length,
      newCustomers: customers.filter((c) => inRange(c.createdAt, range.from, range.to)).length,
      returningCustomers: [...ordersByCustomer.values()].filter((n) => n > 1).length,
      lowStock: products.filter((p) => p.stock === "low-stock").length,
      outOfStock: products.filter((p) => p.stock === "out-of-stock" || p.stockQuantity === 0).length,
    };
  }, [orders, products, customers, range]);

  const charts = useMemo(() => {
    const buckets = buildBuckets(range.from, range.to);
    const labels = buckets.map((b) => b.label);
    const revenueOrders = orders.filter(isRevenueOrder);
    const revenueSeries = sumByBucket(revenueOrders, (o) => o.date, (o) => o.total, buckets);
    const ordersSeries = countByBucket(orders, (o) => o.date, buckets);
    const standardSeries = countByBucket(orders.filter((o) => o.productionSpeed === "standard"), (o) => o.date, buckets);
    const expressSeries = countByBucket(orders.filter((o) => o.productionSpeed === "express"), (o) => o.date, buckets);
    const customerGrowth = cumulativeByBucket(countByBucket(customers, (c) => c.createdAt, buckets));

    const collectionRevenue = new Map<string, number>();
    const productRevenue = new Map<string, number>();
    revenueOrders.forEach((o) =>
      o.items.forEach((it) => {
        const amount = it.product.price * it.quantity;
        const collectionSlug = it.product.collectionSlugs?.[0];
        const collectionName = catalogCollections.find((c) => c.slug === collectionSlug)?.name ?? "Uncategorized";
        collectionRevenue.set(collectionName, (collectionRevenue.get(collectionName) ?? 0) + amount);
        productRevenue.set(it.product.name, (productRevenue.get(it.product.name) ?? 0) + amount);
      })
    );

    const paymentStatusCounts = ["paid", "pending", "failed", "refunded", "partially_refunded"].map((s) => ({
      label: s === "paid" ? "Paid" : s === "pending" ? "Pending" : s === "failed" ? "Failed" : s === "refunded" ? "Refunded" : "Partially Refunded",
      value: orders.filter((o) => o.paymentStatus === s).length,
      color: STATUS[statusRole(s)],
    })).filter((d) => d.value > 0);

    const statusCounts = new Map<string, number>();
    orders.forEach((o) => statusCounts.set(o.status ?? "Order Placed", (statusCounts.get(o.status ?? "Order Placed") ?? 0) + 1));
    const orderStatusBars = [...statusCounts.entries()]
      .map(([label, value]) => ({ label, value, color: STATUS[statusRole(label)] }))
      .sort((a, b) => b.value - a.value);

    return {
      labels,
      revenueSeries,
      ordersSeries,
      standardSeries,
      expressSeries,
      customerGrowth,
      collectionBars: [...collectionRevenue.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      productBars: [...productRevenue.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      paymentStatusCounts,
      orderStatusBars,
    };
  }, [orders, customers, range, catalogCollections]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Real-time overview of the Momen business."
        actions={<DateRangeFilter value={rangeKey} onChange={(k, c) => { setRangeKey(k); setCustom(c); }} />}
      />

      {!isReady ? (
        <p className="text-sm text-ink/50">Loading dashboard…</p>
      ) : (
        <div className="space-y-8">
          <div>
            <SectionTitle>Revenue</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Revenue" value={formatNaira(stats.totalRevenue)} trend={charts.revenueSeries} />
              <StatCard label="Revenue Today" value={formatNaira(stats.revenueToday)} />
              <StatCard label="Revenue This Month" value={formatNaira(stats.revenueThisMonth)} />
              <StatCard label="Total Orders" value={stats.totalOrders} href="/admin/orders" />
            </div>
          </div>

          <div>
            <SectionTitle>Orders &amp; Fulfillment</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label={`New Orders (${range.label})`} value={stats.newOrders} href="/admin/orders" />
              <StatCard label="In Production" value={stats.ordersInProduction} href="/admin/production" />
              <StatCard label="Awaiting Measurements" value={stats.awaitingMeasurements} href="/admin/orders" />
              <StatCard label="Ready for Dispatch" value={stats.readyForDispatch} href="/admin/orders" />
              <StatCard label="Delivered" value={stats.delivered} href="/admin/orders" />
              <StatCard label="Cancelled" value={stats.cancelled} href="/admin/orders" />
            </div>
          </div>

          <div>
            <SectionTitle>Payments &amp; Production Mix</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Pending Payments" value={stats.pendingPayments} href="/admin/payments" />
              <StatCard label="Failed Payments" value={stats.failedPayments} href="/admin/payments" />
              <StatCard label="Refunded Payments" value={stats.refundedPayments} href="/admin/refunds" />
              <StatCard label="Express Orders" value={stats.expressOrders} />
              <StatCard label="Standard Orders" value={stats.standardOrders} />
            </div>
          </div>

          <div>
            <SectionTitle>Customers &amp; Inventory</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total Customers" value={stats.totalCustomers} href="/admin/customers" />
              <StatCard label={`New Customers (${range.label})`} value={stats.newCustomers} href="/admin/customers" />
              <StatCard label="Returning Customers" value={stats.returningCustomers} href="/admin/customers" />
              <StatCard label="Low-Stock Products" value={stats.lowStock} href="/admin/inventory" />
              <StatCard label="Out-of-Stock Products" value={stats.outOfStock} href="/admin/inventory" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle>Revenue Over Time</SectionTitle>
              <LineChart labels={charts.labels} series={[{ label: "Revenue", values: charts.revenueSeries, color: "#A3803E" }]} formatValue={formatNaira} />
            </Card>
            <Card>
              <SectionTitle>Orders Over Time</SectionTitle>
              <LineChart labels={charts.labels} series={[{ label: "Orders", values: charts.ordersSeries }]} />
            </Card>
            <Card>
              <SectionTitle>Standard vs Express Orders</SectionTitle>
              <DonutChart
                data={[
                  { label: "Standard", value: stats.standardOrders },
                  { label: "Express", value: stats.expressOrders },
                ]}
              />
            </Card>
            <Card>
              <SectionTitle>Payment Status</SectionTitle>
              <DonutChart data={charts.paymentStatusCounts} statusColors />
            </Card>
            <Card>
              <SectionTitle>Customer Growth</SectionTitle>
              <LineChart labels={charts.labels} series={[{ label: "Total Customers", values: charts.customerGrowth, color: "#2a78d6" }]} />
            </Card>
            <Card>
              <SectionTitle>Order Status Breakdown</SectionTitle>
              <HorizontalBars data={charts.orderStatusBars} />
            </Card>
            <Card>
              <SectionTitle>Sales by Collection</SectionTitle>
              <HorizontalBars data={charts.collectionBars} formatValue={formatNaira} />
            </Card>
            <Card>
              <SectionTitle>Sales by Product</SectionTitle>
              <HorizontalBars data={charts.productBars} formatValue={formatNaira} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
