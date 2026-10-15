"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";

function PaymentCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Paystack returns `reference`/`trxref`; Flutterwave returns `tx_ref`.
    const reference = params.get("reference") ?? params.get("trxref") ?? params.get("tx_ref");
    if (!reference) {
      setError("The payment reference is missing.");
      return;
    }
    void apiRequest<{ orderId: string; status: "paid" | "failed" | "pending" }>(
      `/payments/verify/${encodeURIComponent(reference)}`,
    )
      .then((result) => {
        if (result.status === "failed") {
          setError("Payment was not completed. Your order is saved, but remains unpaid.");
          return;
        }
        router.replace(`/checkout/confirmation?order=${encodeURIComponent(result.orderId)}`);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "We could not verify this payment."));
  }, [params, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Payment verification needs attention</h1>
        <p className="mt-3 text-sm text-ink/60">{error}</p>
        <Button href="/account" className="mt-6">View Orders</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="eyebrow text-brass">Secure payment</p>
      <h1 className="mt-2 font-display text-3xl">Verifying your payment…</h1>
      <p className="mt-3 text-sm text-ink/60">Please keep this page open for a moment.</p>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return <Suspense><PaymentCallbackContent /></Suspense>;
}
