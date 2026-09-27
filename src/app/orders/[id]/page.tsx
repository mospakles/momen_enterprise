"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useOrders } from "@/lib/orders-context";
import { formatDate, formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { getOrder, advanceOrder, isReady, updateCustomizationStatus } = useOrders();
  const order = getOrder(decodeURIComponent(id));

  if (!isReady) return <div className="mx-auto max-w-3xl px-4 py-24" />;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="font-display text-2xl">Order not found</p>
        <Button href="/account" className="mt-6">Back to Account</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Order Tracking</p>
          <h1 className="mt-1 font-display text-3xl">{order.id}</h1>
          <p className="mt-1 text-sm text-ink/60">Placed {formatDate(order.date)}</p>
        </div>
        {order.productionSpeed === "express" && (
          <span className="eyebrow border border-brass px-3 py-1.5 text-brass">Express Order</span>
        )}
      </div>

      {order.customizationStatus === "awaiting_customer_confirmation" && (
        <div className="mb-8 border border-brass bg-brass/5 p-5">
          <p className="eyebrow mb-1 text-brass">Action needed</p>
          <p className="text-sm text-ink/80">
            Our atelier has reviewed and approved your custom order. Please confirm the details below so we can begin
            production.
          </p>
          <Button onClick={() => updateCustomizationStatus(order.id, "confirmed", "Customer")} className="mt-4">
            Confirm My Custom Order
          </Button>
        </div>
      )}

      {order.customizationStatus === "clarification_requested" && (
        <div className="mb-8 border border-clay bg-clay/5 p-5">
          <p className="eyebrow mb-1 text-clay">We need a little more information</p>
          <p className="text-sm text-ink/80">
            Our atelier needs more detail on your custom order before production can begin.
            {order.customerNotes && order.customerNotes.length > 0 ? " See the latest message below, or " : " Please "}
            reply to your order confirmation email or contact us to keep things moving.
          </p>
          {order.customerNotes && order.customerNotes.length > 0 && (
            <p className="mt-3 border-t border-clay/30 pt-3 text-sm text-ink/70">
              &ldquo;{order.customerNotes[0].message}&rdquo;
            </p>
          )}
          <Button href="/contact" variant="secondary" className="mt-4">
            Contact Us
          </Button>
        </div>
      )}

      <div className="border border-line p-6">
        <ol className="space-y-0">
          {order.timeline.map((t, i) => (
            <li key={t.stage} className="relative flex gap-4 pb-8 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                    t.complete ? "border-brass bg-brass text-ivory" : "border-line text-ink/30"
                  }`}
                >
                  {t.complete ? "✓" : i + 1}
                </span>
                {i < order.timeline.length - 1 && (
                  <span className={`w-px flex-1 ${t.complete ? "bg-brass" : "bg-line"}`} />
                )}
              </div>
              <div className="pb-2">
                <p className={`text-sm font-medium ${t.complete ? "text-ink" : "text-ink/40"}`}>{t.stage}</p>
                {t.complete && <p className="text-xs text-ink/50">{formatDate(t.date)}</p>}
                {t.complete && t.message && <p className="mt-1 text-xs text-ink/60">{t.message}</p>}
              </div>
            </li>
          ))}
        </ol>

        <button
          onClick={() => advanceOrder(order.id)}
          className="eyebrow mt-2 border border-line px-4 py-2 text-ink/60 hover:border-brass hover:text-brass"
        >
          Simulate Next Stage (demo)
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="border border-line p-5">
          <p className="eyebrow mb-3">Items</p>
          <div className="space-y-3">
            {order.items.map((i) => (
              <div key={i.id} className="flex gap-3">
                <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-ivory-deep">
                  <Image src={i.product.images[0]} alt="" fill className="object-cover" />
                </div>
                <div className="text-xs">
                  <p className="text-ink">{i.product.name}</p>
                  <p className="text-ink/50">{i.size} · {i.color} · ×{i.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-line p-5 text-sm">
          <p className="eyebrow mb-3">Delivery</p>
          <p className="text-ink/70">{order.address.fullName}</p>
          <p className="text-ink/70">{order.address.address}, {order.address.city}, {order.address.state}</p>
          <p className="mt-3 text-ink/50">Estimated delivery</p>
          <p className="text-ink">{formatDate(order.estimatedDelivery)}</p>
          <p className="mt-3 text-ink/50">Total</p>
          <p className="font-display text-lg">{formatNaira(order.total)}</p>
        </div>
      </div>
    </div>
  );
}
