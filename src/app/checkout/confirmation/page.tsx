"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useOrders } from "@/lib/orders-context";
import { formatNaira, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";

function ConfirmationContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const { getOrder, isReady } = useOrders();
  const order = orderId ? getOrder(orderId) : undefined;

  if (!isReady) return <div className="mx-auto max-w-2xl px-4 py-24" />;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="font-display text-2xl">We couldn&apos;t find that order</p>
        <Button href="/shop" className="mt-6">
          Back to Shop
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-brass text-brass">
          ✓
        </div>
        <p className="eyebrow">Order Confirmed</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Your Momen order is confirmed.</h1>
        <p className="mt-3 text-sm text-ink/60">
          Order {order.id} · Placed {formatDate(order.date)}
        </p>
      </div>

      <div className="border border-line p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Items Ordered</p>
            <ul className="space-y-1.5 text-sm text-ink/75">
              {order.items.map((i) => (
                <li key={i.id}>
                  {i.product.name} × {i.quantity} ({i.size}, {i.color})
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-ink/50">Payment status:</span> {order.paymentStatus}</p>
            <p><span className="text-ink/50">Production:</span> {order.productionSpeed === "express" ? "Express" : "Standard"}</p>
            <p><span className="text-ink/50">Delivery method:</span> {order.productionSpeed === "express" ? "Priority Delivery" : "Standard Delivery"}</p>
            <p><span className="text-ink/50">Est. completion:</span> {order.estimatedCompletion}</p>
            <p><span className="text-ink/50">Est. delivery:</span> {formatDate(order.estimatedDelivery)}</p>
          </div>
        </div>
        <div className="mt-6 border-t border-line pt-4 text-sm text-ink/70">
          <p className="eyebrow mb-1 text-ink/50">Delivery Address</p>
          <p>{order.address.fullName}, {order.address.address}, {order.address.city}, {order.address.state}, {order.address.country}</p>
        </div>
        <div className="mt-6 flex justify-between border-t border-line pt-4">
          <p className="font-medium">Total Paid</p>
          <p className="font-display text-xl">{formatNaira(order.total)}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href={`/orders/${order.id}`}>Track Order</Button>
        <Button href="/shop" variant="secondary">Continue Shopping</Button>
        <Button href="/account" variant="ghost">View My Orders</Button>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
