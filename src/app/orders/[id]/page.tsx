"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SmartImage from "@/components/ui/SmartImage";
import { canCompletePayment, fetchGuestOrder, readLastOrder, useOrders, usePaymentRetry } from "@/lib/orders-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { placeholderFor } from "@/lib/brand-images";
import type { CartItem, Order } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/api";
import { orderPhase, PHASES } from "@/lib/order-phases";
import OrderPhases from "@/components/account/OrderPhases";

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = decodeURIComponent(id);
  const { getOrder, addOrder, isReady, updateCustomizationStatus } = useOrders();
  const { currentUser } = useCustomerAuth();
  const order = getOrder(orderId);
  const retry = usePaymentRetry();
  const router = useRouter();
  // Guest fallback: the order isn't in the signed-in list, so look it up by
  // order number + email (from this session's checkout, or the form below).
  const [lookup, setLookup] = useState<"idle" | "auto" | "done">("idle");
  const [guestEmail, setGuestEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isReady || order || lookup !== "idle") return;
    const last = readLastOrder();
    if (last.id !== orderId || !last.email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing stored for this order; show the lookup form
      setLookup("done");
      return;
    }
    const email = last.email;
    setLookup("auto");
    void fetchGuestOrder(orderId, email)
      .then((found) => {
        setGuestEmail(email);
        addOrder(found);
      })
      .catch(() => undefined)
      .finally(() => setLookup("done"));
  }, [addOrder, isReady, lookup, order, orderId]);

  if (!isReady || (!order && lookup !== "done")) {
    return <div className="mx-auto max-w-3xl px-4 py-24" role="status" aria-live="polite" aria-busy="true"><span className="sr-only">Loading your order…</span></div>;
  }

  if (!order) {
    return (
      <GuestLookup
        initialId={orderId}
        signedIn={Boolean(currentUser)}
        onFound={(found, email) => {
          setGuestEmail(email);
          addOrder(found);
          if (found.id !== orderId) router.replace(`/orders/${encodeURIComponent(found.id)}`);
        }}
      />
    );
  }

  const ownerEmail = currentUser ? undefined : guestEmail ?? (readLastOrder().id === order.id ? readLastOrder().email : undefined);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-clay">Order {order.id} · placed {formatDate(order.date)}</p>
          <h1 className="display mt-4 text-[clamp(2.6rem,6vw,4.5rem)]">{orderPhase(order).exception ?? PHASES[orderPhase(order).index]}.</h1>
          {orderPhase(order).index < 3 && !orderPhase(order).exception && order.estimatedDelivery && (
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

      {canCompletePayment(order) && (currentUser || ownerEmail) && (
        <div className="mb-8 border border-terracotta bg-bone/60 p-5">
          <p className="eyebrow mb-1 text-terracotta">{order.paymentStatus === "failed" ? "Payment didn't go through" : "Awaiting payment"}</p>
          <p className="text-sm text-ink/80">
            Your order is saved but unpaid — nothing has been charged. Complete payment of {formatNaira(order.total)} to send it to the atelier.
          </p>
          <button
            type="button"
            onClick={() => void retry.start(order.id, ownerEmail)}
            disabled={retry.busy}
            aria-busy={retry.busy}
            className="mt-4 bg-ink px-6 py-3 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta disabled:cursor-wait disabled:opacity-60"
          >
            {retry.busy ? "Opening secure payment…" : "Complete payment"}
          </button>
          {retry.error && <p role="alert" className="mt-2 text-sm text-error">{retry.error}</p>}
        </div>
      )}

      {order.customizationStatus === "awaiting_customer_confirmation" && (
        <div className="mb-8 border border-brass bg-brass/5 p-5">
          <p className="eyebrow mb-1 text-brass">Action needed</p>
          <p className="text-sm text-ink/80">
            Our atelier has reviewed and approved your custom order. Please confirm the details below so we can begin
            production.
          </p>
          {currentUser ? (
            <Button type="button" onClick={() => updateCustomizationStatus(order.id, "confirmed", "Customer")} className="mt-4">
              Confirm My Custom Order
            </Button>
          ) : (
            <Button href="/contact" className="mt-4">
              Contact us to confirm
            </Button>
          )}
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
            <li key={`${t.stage}-${i}`} className="relative flex gap-4 pb-8 last:pb-0">
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
                  <SmartImage src={i.product.images?.[0]} alt="" fill sizes="44px" placeholder={placeholderFor(i.product.images?.[0])} className="object-cover" />
                </div>
                <div className="text-xs">
                  <p className="text-ink">{i.product.name}</p>
                  <p className="text-ink/50">
                    {i.color ? `${i.color} · ` : ""}×{i.quantity}
                  </p>
                  <p className="text-ink/60">{fitSummary(i)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-line p-5 text-sm">
          <p className="eyebrow mb-3">Delivery</p>
          {order.address && (
            <>
              <p className="text-ink/70">{order.address.fullName}</p>
              <p className="text-ink/70">{order.address.address}, {order.address.city}, {order.address.state}</p>
            </>
          )}
          <p className="mt-3 text-ink/50">Estimated delivery</p>
          <p className="text-ink">{order.estimatedDelivery ? formatDate(order.estimatedDelivery) : "To be confirmed"}</p>
          <p className="mt-3 text-ink/50">Total</p>
          <p className="font-display text-lg">{formatNaira(order.total)}</p>
        </div>
      </div>

      {(order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded") &&
        (currentUser ? (
          <ReturnsFlow order={order} />
        ) : (
          <section className="mt-12 border-t border-line pt-10 text-sm text-ink/65">
            <h2 className="display text-3xl text-ink">Returns &amp; exchanges</h2>
            <p className="mt-4">
              Not quite right? <Link href="/contact" className="link-line text-ink">Contact us</Link> with your order number, or{" "}
              <Link href={`/login?redirect=${encodeURIComponent(`/orders/${order.id}`)}`} className="link-line text-ink">sign in</Link> to start a return online.
            </p>
          </section>
        ))}
    </div>
  );
}

/** "Cut to your measurements" vs "Standard size M" for a line. */
function fitSummary(item: CartItem) {
  const measured = item.fit === "measure" || (item.measurement && item.measurement.mode !== "pending" && item.fit !== "standard");
  if (measured) {
    const m = item.measurement;
    if (!m || m.mode === "pending") return "Cut to your measurements · measurements to follow";
    const count = Object.keys(m.values ?? {}).length;
    return `Cut to your measurements${m.mode === "profile" ? " · from your saved profile" : count ? ` · ${count} measurements (${m.unit})` : ""}`;
  }
  return /one.?size/i.test(item.size) ? "One size" : `Standard size ${item.size}`;
}

/** Order lookup for guests (or a signed-in customer viewing a guest order). */
function GuestLookup({ initialId, signedIn, onFound }: { initialId: string; signedIn: boolean; onFound: (order: Order, email: string) => void }) {
  const [orderNo, setOrderNo] = useState(initialId);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!orderNo.trim()) return setError("Enter your order number.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter the email you used at checkout.");
    setBusy(true);
    setError(null);
    try {
      const found = await fetchGuestOrder(orderNo, email);
      onFound(found, email.trim());
    } catch {
      setError("We couldn't find an order with that number and email. Check both and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <p className="label text-clay">Order</p>
      <h1 className="display mt-4 text-4xl">Find your order</h1>
      <p className="mt-3 text-sm text-ink/65">Enter your order number and the email you used at checkout.</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <label className="block">
          <span className="label text-ink/60">Order number</span>
          <input
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full border-b border-line bg-transparent py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="block">
          <span className="label text-ink/60">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "lookup-error" : undefined}
            className="mt-1 w-full border-b border-line bg-transparent py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>
        {error && <p id="lookup-error" role="alert" className="text-sm text-error">{error}</p>}
        <button type="submit" disabled={busy} className="w-full bg-ink px-6 py-4 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta disabled:opacity-60">
          {busy ? "Looking it up…" : "Find my order"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-ink/55">
        {signedIn ? (
          <Link href="/account" className="link-line">Back to your account</Link>
        ) : (
          <>Have an account? <Link href={`/login?redirect=${encodeURIComponent(`/orders/${initialId}`)}`} className="link-line">Sign in</Link></>
        )}
      </p>
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
