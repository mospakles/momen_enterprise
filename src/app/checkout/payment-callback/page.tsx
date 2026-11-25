"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { readLastOrder, usePaymentRetry } from "@/lib/orders-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";

type Outcome =
  | { state: "verifying" }
  | { state: "failed"; orderId?: string }
  | { state: "pending"; orderId?: string }
  | { state: "error"; message: string; orderId?: string };

function PaymentCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { currentUser } = useCustomerAuth();
  const retry = usePaymentRetry();
  const [outcome, setOutcome] = useState<Outcome>({ state: "verifying" });
  // Paystack returns `reference`/`trxref`; Flutterwave returns `tx_ref`.
  const reference = params.get("reference") ?? params.get("trxref") ?? params.get("tx_ref");

  useEffect(() => {
    let active = true;
    const lastOrderId = readLastOrder().id;
    if (!reference) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no reference to verify; show the failure state
      setOutcome({ state: "error", message: "The payment provider didn't send a payment reference back.", orderId: lastOrderId });
      return;
    }
    void apiRequest<{ orderId: string; status: "paid" | "failed" | "pending" }>(`/payments/verify/${encodeURIComponent(reference)}`)
      .then((result) => {
        if (!active) return;
        if (result.status === "paid") {
          router.replace(`/checkout/confirmation?order=${encodeURIComponent(result.orderId)}`);
          return;
        }
        setOutcome({ state: result.status, orderId: result.orderId });
      })
      .catch((reason) => {
        if (!active) return;
        setOutcome({
          state: "error",
          message: reason instanceof Error ? reason.message : "We could not verify this payment.",
          orderId: lastOrderId,
        });
      });
    return () => {
      active = false;
    };
  }, [reference, router]);

  if (outcome.state === "verifying") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center" role="status" aria-live="polite" aria-busy="true">
        <p className="eyebrow text-brass">Secure payment</p>
        <h1 className="mt-2 font-display text-3xl">Verifying your payment…</h1>
        <p className="mt-3 text-sm text-ink/60">Please keep this page open for a moment.</p>
      </div>
    );
  }

  const orderId = outcome.orderId;
  const last = readLastOrder();
  // Guests prove ownership with the checkout email; signed-in customers by session.
  const email = !currentUser && last.id === orderId ? last.email : undefined;
  const canRetry = Boolean(orderId) && (Boolean(currentUser) || Boolean(email));
  const pending = outcome.state === "pending";

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div role="status" aria-live="polite">
        <p className="eyebrow text-brass">{pending ? "Payment processing" : "Payment not completed"}</p>
        <h1 className="mt-2 font-display text-3xl">
          {pending ? "We're still confirming your payment" : "Your payment didn't go through"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          {pending
            ? "Your bank or the payment provider hasn't confirmed it yet. Please don't pay again for now — we'll email you as soon as it clears, usually within a few minutes."
            : outcome.state === "error"
              ? `${outcome.message} Nothing has been charged.`
              : "The payment was cancelled or declined, so nothing has been charged."}
          {orderId && !pending && <> Your order <strong className="font-medium text-ink">{orderId}</strong> is saved and waiting for payment.</>}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {!pending && canRetry && (
          <button
            type="button"
            onClick={() => void retry.start(orderId!, email)}
            disabled={retry.busy}
            aria-busy={retry.busy}
            className="w-full bg-ink px-6 py-4 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta disabled:cursor-wait disabled:opacity-60"
          >
            {retry.busy ? "Opening secure payment…" : "Try payment again"}
          </button>
        )}
        {retry.error && (
          <p role="alert" className="text-sm text-error">
            {retry.error}
          </p>
        )}
        {orderId && (
          <Link href={`/orders/${encodeURIComponent(orderId)}`} className="w-full border border-ink px-6 py-4 text-sm tracking-wide text-ink transition-colors hover:bg-ink hover:text-ivory">
            View your order
          </Link>
        )}
        <Link href="/contact" className="label link-line mx-auto mt-2 text-ink/70 hover:text-ink">
          Contact us
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <PaymentCallbackContent />
    </Suspense>
  );
}
