"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useOrders } from "@/lib/orders-context";
import { formatDate, formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/api";
import { orderPhase, PHASES } from "@/lib/order-phases";
import OrderPhases from "@/components/account/OrderPhases";

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { getOrder, isReady, updateCustomizationStatus } = useOrders();
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
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-clay">Order {order.id} · placed {formatDate(order.date)}</p>
          <h1 className="display mt-4 text-[clamp(2.6rem,6vw,4.5rem)]">{orderPhase(order).exception ?? PHASES[orderPhase(order).index]}.</h1>
          {orderPhase(order).index < 3 && !orderPhase(order).exception && (
            <p className="mt-2 text-ink/60">Expected by {formatDate(order.estimatedDelivery)}</p>
          )}
        </div>
        {order.productionSpeed === "express" && <span className="label border border-ink px-3 py-1.5">Express</span>}
      </div>
      {!orderPhase(order).exception && (
        <div className="mb-14">
          <OrderPhases index={orderPhase(order).index} />
        </div>
      )}

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

      <details className="group border border-line p-6">
        <summary className="label flex cursor-pointer list-none items-center justify-between text-ink/70">
          Every step in the atelier <span aria-hidden className="transition-transform group-open:rotate-45">+</span>
        </summary>
        <ol className="mt-6 space-y-0">
          {order.timeline.map((t, i) => (
            <li key={t.stage} className="relative flex gap-4 pb-8 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                    t.complete ? "border-ink bg-ink text-ivory" : "border-line text-ink/30"
                  }`}
                >
                  {t.complete ? "✓" : i + 1}
                </span>
                {i < order.timeline.length - 1 && (
                  <span className={`w-px flex-1 ${t.complete ? "bg-ink" : "bg-line"}`} />
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
      </details>

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

      {(order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded") && <ReturnsFlow order={order} />}
    </div>
  );
}

const RETURN_REASONS = ["Doesn't fit", "Not as pictured", "Arrived damaged", "Changed my mind", "Other"];

/** Return or exchange request. Sent to the existing refund-request endpoint
 * (exchanges are reviewed by the team from the details in the reason). */
function ReturnsFlow({ order }: { order: NonNullable<ReturnType<ReturnType<typeof useOrders>["getOrder"]>> }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"return" | "exchange">("return");
  const [selected, setSelected] = useState<Record<string, string>>({}); // itemId -> new size ("" for returns)
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const chosen = order.items.filter((i) => i.id in selected);

  async function submit() {
    if (chosen.length === 0) return setError("Choose at least one piece.");
    if (kind === "exchange" && chosen.some((i) => !selected[i.id])) return setError("Choose the new size for each piece.");
    setError(null);
    setState("sending");
    const lines = chosen.map((i) => `${i.product.name} (${i.size}, ${i.color})${kind === "exchange" ? ` → size ${selected[i.id]}` : ""}`);
    try {
      await apiRequest(`/orders/mine/${encodeURIComponent(order.id)}/refund-request`, {
        method: "POST",
        body: {
          type: kind === "return" && chosen.length === order.items.length ? "full" : "partial",
          reason: `${kind === "exchange" ? "EXCHANGE" : "RETURN"} — ${reason}. Items: ${lines.join("; ")}.${notes.trim() ? ` Notes: ${notes.trim()}` : ""}`,
        },
      });
      setState("sent");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Please try again.");
    }
  }

  return (
    <section id="returns" aria-labelledby="returns-heading" className="mt-12 border-t border-line pt-10">
      <h2 id="returns-heading" className="display text-3xl">Returns &amp; exchanges</h2>
      {state === "sent" ? (
        <p className="mt-4 bg-bone/60 p-6 text-sm text-ink/80">
          Request received. We&rsquo;ll email you within two working days with next steps and a collection time.
        </p>
      ) : !open ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <p className="text-sm text-ink/65">Not quite right? We&rsquo;ll make it so.</p>
          <button type="button" onClick={() => setOpen(true)} className="border border-ink px-5 py-2.5 text-sm transition-colors hover:bg-ink hover:text-ivory">
            Start a return or exchange
          </button>
          <Link href="/returns-policy" className="label link-line text-ink/60">Policy</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <div className="grid grid-cols-2 border border-line p-1" role="radiogroup" aria-label="Request type">
            {(["return", "exchange"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`py-2.5 text-sm capitalize transition-colors ${kind === k ? "bg-ink text-ivory" : "text-ink/70 hover:text-ink"}`}>
                {k === "return" ? "Return for refund" : "Exchange size"}
              </button>
            ))}
          </div>
          <fieldset>
            <legend className="label mb-3 text-ink/60">Which pieces?</legend>
            <ul className="space-y-3">
              {order.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-4 border border-line p-4">
                  <label className="flex flex-1 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={i.id in selected}
                      onChange={(e) =>
                        setSelected((s) => {
                          const next = { ...s };
                          if (e.target.checked) next[i.id] = "";
                          else delete next[i.id];
                          return next;
                        })
                      }
                      className="h-4 w-4 accent-ink"
                    />
                    {i.product.name} <span className="text-ink/50">{i.size} · {i.color}</span>
                  </label>
                  {kind === "exchange" && i.id in selected && (
                    <label className="text-sm">
                      <span className="sr-only">New size for {i.product.name}</span>
                      <select value={selected[i.id]} onChange={(e) => setSelected((s) => ({ ...s, [i.id]: e.target.value }))} className="border-b border-line bg-transparent py-1 outline-none focus:border-ink">
                        <option value="" disabled>New size</option>
                        {(i.product.sizes ?? []).filter((sz) => sz !== i.size).map((sz) => (
                          <option key={sz}>{sz}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </fieldset>
          <label className="block">
            <span className="label text-ink/60">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full border-b border-line bg-transparent py-2.5 outline-none focus:border-ink">
              {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label text-ink/60">Anything we should know? (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full resize-none border border-line bg-transparent p-3 text-sm outline-none focus:border-ink" />
          </label>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={submit} disabled={state === "sending"} className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta disabled:opacity-50">
              {state === "sending" ? "Sending…" : "Send request"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="label px-3 text-ink/60 hover:text-ink">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
