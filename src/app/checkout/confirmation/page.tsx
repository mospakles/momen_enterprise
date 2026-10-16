"use client";

// The order confirmation, written as a note from the house: what happens
// next, when it arrives, how to follow it, and one piece worth considering.

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { m } from "motion/react";
import { useOrders } from "@/lib/orders-context";
import { useAdminStore } from "@/lib/admin/store";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { formatNaira, formatDate } from "@/lib/format";
import { apiRequest } from "@/lib/api";
import { itemFromProduct, track } from "@/lib/analytics";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { SplitText } from "@/lib/motion/SplitText";
import { placeholderFor } from "@/lib/brand-images";
import type { Order } from "@/lib/types";

function ConfirmationContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const { getOrder, addOrder, isReady } = useOrders();
  const { products } = useAdminStore();
  const { currentUser } = useCustomerAuth();
  const order = orderId ? getOrder(orderId) : undefined;
  const tracked = useRef(false);

  useEffect(() => {
    if (!isReady || !orderId || order) return;
    let stored: { id?: string; email?: string } = {};
    try {
      stored = JSON.parse(sessionStorage.getItem("momen.last-order") ?? "{}");
    } catch {
      stored = {};
    }
    if (stored.id !== orderId || !stored.email) return;
    void apiRequest<Order>(`/orders/track?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(stored.email)}`)
      .then(addOrder)
      .catch(() => undefined);
  }, [addOrder, isReady, order, orderId]);

  useEffect(() => {
    if (!order || tracked.current) return;
    tracked.current = true;
    track("purchase", {
      transaction_id: order.id,
      value: order.total,
      shipping: order.deliveryFee,
      coupon: order.couponCode,
      items: order.items.map((i) => itemFromProduct(i.product, i)),
    });
  }, [order]);

  // One recommendation that isn't already in the order.
  const recommendation = useMemo(() => {
    if (!order) return undefined;
    const ordered = new Set(order.items.map((i) => i.product.id));
    const collections = new Set(order.items.flatMap((i) => i.product.collectionSlugs ?? []));
    return products.find((p) => p.publishStatus === "published" && !ordered.has(p.id) && p.collectionSlugs.some((c) => collections.has(c)) && p.images[0])
      ?? products.find((p) => p.publishStatus === "published" && !ordered.has(p.id) && p.isSignature);
  }, [order, products]);

  if (!isReady) return <div className="mx-auto min-h-[60vh] max-w-2xl px-4 py-24" aria-busy="true" />;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <p className="label text-clay">Order</p>
        <h1 className="display mt-4 text-5xl">We can&rsquo;t find that order here.</h1>
        <p className="mt-4 text-ink/60">If you&rsquo;ve just paid, it may take a moment. You can also follow it from your account or the tracking page.</p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/account" className="bg-ink px-6 py-3 text-sm text-ivory hover:bg-terracotta">Your orders</Link>
          <Link href="/shop" className="border border-line px-6 py-3 text-sm hover:border-ink">Continue shopping</Link>
        </div>
      </div>
    );
  }

  const paid = order.paymentStatus === "paid";
  const firstName = order.address.fullName.split(" ")[0] || "there";
  const timeline = [
    { label: "Order received", date: formatDate(order.date), done: true },
    { label: paid ? "Payment confirmed" : "Awaiting payment", date: paid ? "Done" : order.paymentMethod === "transfer" ? "Once your transfer clears" : "Pending", done: paid },
    { label: "In the atelier", date: `Ready by ${order.estimatedCompletion}`, done: false },
    { label: "On its way to you", date: `Arrives by ${formatDate(order.estimatedDelivery)}`, done: false },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6 lg:pt-20">
      <div className="max-w-2xl">
        <p className="label text-clay">Order {order.id}</p>
        <SplitText as="h1" text={`Thank you, ${firstName}.`} className="display mt-5 text-[clamp(3rem,8vw,6rem)]" />
        <m.p
          className="mt-6 text-[1.05rem] leading-relaxed text-ink/75"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE_HOUSE, delay: 0.5 }}
        >
          {paid
            ? "Your order is confirmed and already on a tailor's table in Lagos. We'll write as it moves from cloth to doorstep."
            : "Your order is reserved. As soon as payment clears, it goes to the atelier — we'll write as it moves from cloth to doorstep."}
        </m.p>
        <p className="mt-6 font-display text-xl italic text-ink/70">— The house of momen.</p>
      </div>

      {order.paymentMethod === "transfer" && !paid && (
        <div className="mt-12 border-l-2 border-terracotta bg-bone/60 p-6 text-sm leading-relaxed text-ink/75">
          <p className="label mb-2 text-terracotta">To complete your order</p>
          Pay <strong>{formatNaira(order.total)}</strong> by bank transfer using <strong>{order.id}</strong> as the reference. We&rsquo;ll confirm by email
          once it&rsquo;s reconciled. <Link href="/contact" className="underline underline-offset-2">Contact us</Link> for the account details.
        </div>
      )}

      <div className="mt-16 grid gap-14 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="next-heading">
          <h2 id="next-heading" className="label text-ink/60">What happens next</h2>
          <ol className="mt-6">
            {timeline.map((t, i) => (
              <m.li
                key={t.label}
                className="relative grid grid-cols-[1.75rem_1fr] pb-8 last:pb-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.12, duration: 0.7, ease: EASE_HOUSE }}
              >
                {i < timeline.length - 1 && <span aria-hidden className="absolute left-1.5 top-4 h-full w-px bg-line" />}
                <span aria-hidden className={`relative mt-1.5 h-3.25 w-3.25 rounded-full border ${t.done ? "border-ink bg-ink" : "border-ink/30 bg-ivory"}`} />
                <span>
                  <span className="block">{t.label}</span>
                  <span className="block text-sm text-ink/55">{t.date}</span>
                </span>
              </m.li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/orders/${order.id}`} className="bg-ink px-6 py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta">
              Track your order
            </Link>
            <Link href="/shop" className="border border-line px-6 py-3.5 text-sm tracking-wide hover:border-ink">
              Continue shopping
            </Link>
          </div>
          {!currentUser && (
            <div className="mt-10 bg-bone/60 p-6">
              <p className="font-medium">Keep your measurements and orders in one place.</p>
              <p className="mt-1 text-sm text-ink/65">Create an account with the same email to follow this order and check out faster next time.</p>
              <Link href="/signup?redirect=/account" className="label link-line mt-4 inline-block text-ink">
                Create an account
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="summary-heading" className="h-fit border border-line p-6">
          <h2 id="summary-heading" className="label text-ink/60">Your order</h2>
          <ul className="mt-5 space-y-4">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 text-sm">
                {i.product.images?.[0] && (
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden bg-bone">
                    <Image src={i.product.images[0]} alt="" fill sizes="48px" placeholder={placeholderFor(i.product.images[0])} className="object-cover" />
                  </span>
                )}
                <span className="flex-1">
                  <span className="block">{i.product.name}</span>
                  <span className="block text-xs text-ink/55">{i.size} · {i.color} · ×{i.quantity}</span>
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd>{formatNaira(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/60">Delivery</dt><dd>{order.deliveryFee ? formatNaira(order.deliveryFee) : "Free"}</dd></div>
            {order.expressFee > 0 && <div className="flex justify-between"><dt className="text-ink/60">Express</dt><dd>{formatNaira(order.expressFee)}</dd></div>}
            {order.discount > 0 && <div className="flex justify-between"><dt className="text-ink/60">Discount</dt><dd>−{formatNaira(order.discount)}</dd></div>}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm">{paid ? "Paid" : "Due"}</span>
            <span className="display text-2xl">{formatNaira(order.total)}</span>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-ink/55">
            Delivering to {order.address.fullName}, {order.address.address}, {order.address.city}, {order.address.state}.
          </p>
        </section>
      </div>

      {recommendation && (
        <section aria-labelledby="rec-heading" className="mt-24 grid items-center gap-10 border-t border-line pt-16 sm:grid-cols-2">
          <Link href={`/product/${recommendation.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-bone">
            <Image src={recommendation.images[0]} alt={recommendation.name} fill sizes="(min-width:640px) 45vw, 100vw" placeholder={placeholderFor(recommendation.images[0])} className="object-cover transition-transform duration-[1.2s] ease-house group-hover:scale-[1.04]" />
          </Link>
          <div>
            <p className="label text-clay">For your next occasion</p>
            <h2 id="rec-heading" className="display mt-4 text-5xl">{recommendation.name}</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/70">{recommendation.shortDescription || recommendation.description}</p>
            <Link href={`/product/${recommendation.slug}`} className="label link-line mt-8 inline-block text-ink">View the piece</Link>
          </div>
        </section>
      )}
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
