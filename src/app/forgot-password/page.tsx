"use client";
import AuthShell from "@/components/auth/AuthShell";
import { MEDIA } from "@/components/journey/media";

import { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await apiRequest("/auth/password-reset/request", { method: "POST", body: { email } }).catch(() => undefined);
    setSubmitting(false);
    setSent(true);
  }

  return (
    <AuthShell image={MEDIA.auth.recover}>
      <p className="eyebrow text-clay">Account recovery</p>
      <h1 className="mt-2 font-display text-3xl">Reset your password</h1>
      {sent ? (
        <p className="mt-4 text-sm text-ink/70">If that email belongs to a Momen account, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 border border-line p-6">
          <label className="flex flex-col gap-1.5"><span className="text-xs text-ink/60">Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass" /></label>
          <Button type="submit" disabled={submitting} className="w-full justify-center">{submitting ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
      <Link href="/login" className="mt-6 text-sm text-brass hover:underline">Back to sign in</Link>
    </AuthShell>
  );
}
