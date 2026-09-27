"use client";

import { useMemo } from "react";
import { useOrders } from "@/lib/orders-context";
import { useAdminStore } from "@/lib/admin/store";
import { formatDate } from "@/lib/format";
import { PageHeader, Card } from "@/components/admin/ui/primitives";
import { exportCsv, Column } from "@/components/admin/ui/DataTable";
import { Icon } from "@/components/admin/ui/icons";

function noRender() {
  return null;
}

export default function AdminReportsPage() {
  const { orders } = useOrders();
  const { customers, products, refunds, deliveryZones } = useAdminStore();

  const reports = useMemo(() => {
    const salesColumns: Column<(typeof orders)[number]>[] = [
      { key: "id", label: "Order", render: noRender, csvValue: (o) => o.id },
      { key: "date", label: "Date", render: noRender, csvValue: (o) => formatDate(o.date) },
      { key: "subtotal", label: "Subtotal", render: noRender, csvValue: (o) => o.subtotal },
      { key: "discount", label: "Discount", render: noRender, csvValue: (o) => o.discount },
      { key: "total", label: "Total", render: noRender, csvValue: (o) => o.total },
      { key: "status", label: "Status", render: noRender, csvValue: (o) => o.status ?? "" },
    ];

    const ordersColumns: Column<(typeof orders)[number]>[] = [
      { key: "id", label: "Order", render: noRender, csvValue: (o) => o.id },
      { key: "customer", label: "Customer", render: noRender, csvValue: (o) => o.address.fullName },
      { key: "items", label: "Items", render: noRender, csvValue: (o) => o.items.length },
      { key: "speed", label: "Speed", render: noRender, csvValue: (o) => o.productionSpeed },
      { key: "country", label: "Country", render: noRender, csvValue: (o) => o.address.country },
      { key: "total", label: "Total", render: noRender, csvValue: (o) => o.total },
      { key: "status", label: "Status", render: noRender, csvValue: (o) => o.status ?? "" },
    ];

    const customersColumns: Column<(typeof customers)[number]>[] = [
      { key: "name", label: "Name", render: noRender, csvValue: (c) => c.name },
      { key: "email", label: "Email", render: noRender, csvValue: (c) => c.email },
      { key: "status", label: "Status", render: noRender, csvValue: (c) => c.status },
      { key: "orders", label: "Orders", render: noRender, csvValue: (c) => orders.filter((o) => o.customerEmail === c.email).length },
      { key: "spent", label: "Total Spent", render: noRender, csvValue: (c) => orders.filter((o) => o.customerEmail === c.email).reduce((s, o) => s + o.total, 0) },
      { key: "created", label: "Customer Since", render: noRender, csvValue: (c) => formatDate(c.createdAt) },
    ];

    const productsColumns: Column<(typeof products)[number]>[] = [
      { key: "name", label: "Product", render: noRender, csvValue: (p) => p.name },
      { key: "sku", label: "SKU", render: noRender, csvValue: (p) => p.sku },
      { key: "category", label: "Category", render: noRender, csvValue: (p) => p.category },
      { key: "price", label: "Price", render: noRender, csvValue: (p) => p.price },
      { key: "stock", label: "Stock", render: noRender, csvValue: (p) => p.stock },
      { key: "status", label: "Status", render: noRender, csvValue: (p) => p.publishStatus },
    ];

    const inventoryColumns: Column<(typeof products)[number]>[] = [
      { key: "name", label: "Product", render: noRender, csvValue: (p) => p.name },
      { key: "sku", label: "SKU", render: noRender, csvValue: (p) => p.sku },
      { key: "qty", label: "In Stock", render: noRender, csvValue: (p) => p.stockQuantity },
      { key: "reserved", label: "Reserved", render: noRender, csvValue: (p) => p.reservedQuantity ?? 0 },
      { key: "threshold", label: "Low-Stock Threshold", render: noRender, csvValue: (p) => p.lowStockThreshold },
    ];

    const paymentsColumns: Column<(typeof orders)[number]>[] = [
      { key: "txn", label: "Transaction ID", render: noRender, csvValue: (o) => o.transactionId ?? "" },
      { key: "order", label: "Order", render: noRender, csvValue: (o) => o.id },
      { key: "provider", label: "Provider", render: noRender, csvValue: (o) => o.paymentProvider ?? "" },
      { key: "amount", label: "Amount", render: noRender, csvValue: (o) => o.total },
      { key: "status", label: "Status", render: noRender, csvValue: (o) => o.paymentStatus },
      { key: "date", label: "Date", render: noRender, csvValue: (o) => formatDate(o.date) },
    ];

    const refundsColumns: Column<(typeof refunds)[number]>[] = [
      { key: "id", label: "Refund", render: noRender, csvValue: (r) => r.id },
      { key: "order", label: "Order", render: noRender, csvValue: (r) => r.orderId },
      { key: "amount", label: "Amount", render: noRender, csvValue: (r) => r.amount },
      { key: "type", label: "Type", render: noRender, csvValue: (r) => r.type },
      { key: "status", label: "Status", render: noRender, csvValue: (r) => r.status },
      { key: "date", label: "Requested", render: noRender, csvValue: (r) => formatDate(r.requestedAt) },
    ];

    const productionColumns: Column<(typeof orders)[number]>[] = [
      { key: "order", label: "Order", render: noRender, csvValue: (o) => o.id },
      { key: "staff", label: "Assigned Staff", render: noRender, csvValue: (o) => o.production?.assignedStaffId ?? "" },
      { key: "priority", label: "Priority", render: noRender, csvValue: (o) => o.production?.priority ?? 0 },
      { key: "expected", label: "Expected Completion", render: noRender, csvValue: (o) => (o.production?.expectedCompletionDate ? formatDate(o.production.expectedCompletionDate) : "") },
      { key: "actual", label: "Actual Completion", render: noRender, csvValue: (o) => (o.production?.actualCompletionDate ? formatDate(o.production.actualCompletionDate) : "") },
    ];

    const deliveryColumns: Column<(typeof deliveryZones)[number]>[] = [
      { key: "name", label: "Zone", render: noRender, csvValue: (z) => z.name },
      { key: "countries", label: "Countries", render: noRender, csvValue: (z) => z.countries.join("; ") },
      { key: "standardFee", label: "Standard Fee", render: noRender, csvValue: (z) => z.standardFee },
      { key: "expressFee", label: "Express Fee", render: noRender, csvValue: (z) => z.expressFee },
      { key: "active", label: "Active", render: noRender, csvValue: (z) => (z.active ? "Yes" : "No") },
    ];

    return [
      { id: "sales", title: "Sales Report", description: "Every order's subtotal, discount, and total.", icon: "dollar", count: orders.length, run: () => exportCsv("sales-report.csv", salesColumns, orders) },
      { id: "orders", title: "Orders Report", description: "Full order list with fulfillment status.", icon: "box", count: orders.length, run: () => exportCsv("orders-report.csv", ordersColumns, orders) },
      { id: "customers", title: "Customers Report", description: "Customer list with lifetime order count and spend.", icon: "users", count: customers.length, run: () => exportCsv("customers-report.csv", customersColumns, customers) },
      { id: "products", title: "Products Report", description: "Full product catalog with pricing and status.", icon: "box", count: products.length, run: () => exportCsv("products-report.csv", productsColumns, products) },
      { id: "inventory", title: "Inventory Report", description: "Stock levels for ready-to-wear products.", icon: "archive", count: products.filter((p) => p.productionType === "ready-to-wear").length, run: () => exportCsv("inventory-report.csv", inventoryColumns, products.filter((p) => p.productionType === "ready-to-wear")) },
      { id: "payments", title: "Payments Report", description: "Transaction-level payment detail.", icon: "card", count: orders.length, run: () => exportCsv("payments-report.csv", paymentsColumns, orders) },
      { id: "refunds", title: "Refunds Report", description: "All refund requests and their status.", icon: "refresh", count: refunds.length, run: () => exportCsv("refunds-report.csv", refundsColumns, refunds) },
      { id: "production", title: "Production Report", description: "Staff assignment and completion dates per order.", icon: "scissors", count: orders.length, run: () => exportCsv("production-report.csv", productionColumns, orders) },
      { id: "delivery", title: "Delivery Report", description: "Delivery zone configuration and fees.", icon: "truck", count: deliveryZones.length, run: () => exportCsv("delivery-report.csv", deliveryColumns, deliveryZones) },
    ];
  }, [orders, customers, products, refunds, deliveryZones]);

  return (
    <div>
      <PageHeader title="Reports" description="Generate CSV exports for finance, operations, and analysis." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.id} className="flex flex-col">
            <Icon name={r.icon} className="mb-3 h-5 w-5 text-brass" />
            <p className="font-medium">{r.title}</p>
            <p className="mt-1 flex-1 text-xs text-ink/50">{r.description}</p>
            <p className="mt-3 text-xs text-ink/35">{r.count} record(s)</p>
            <button onClick={r.run} className="mt-3 border border-line px-3 py-1.5 text-xs hover:border-brass">
              Download CSV
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
