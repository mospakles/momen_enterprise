"use client";
import AuthShell from "@/components/auth/AuthShell";
import { MEDIA } from "@/components/journey/media";

import { useState } from "react";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/auth/password-reset/request", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      // Never reveal whether the email exists: a 404 reads as success too.
      if (err instanceof ApiError && err.status === 404) setSent(true);
      else if (err instanceof ApiError && err.status === 429) setError("Too many attempts. Please wait a few minutes and try again.");
      else if (err instanceof ApiError && err.status >= 400 && err.status < 500) setError(err.message || "Please check the email address and try again.");
      else setError("We couldn't reach our servers. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell image={MEDIA.auth.recover}>
      <p className="eyebrow text-clay">Account recovery</p>
      <h1 className="mt-2 font-display text-3xl">Reset your password</h1>
      {sent ? (
        <p className="mt-4 text-sm text-ink/70">If that email belongs to a Momen account, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 border border-line p-6">
          <label className="flex flex-col gap-1.5"><span className="text-xs text-ink/60">Email</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass" /></label>
          {error && <p role="alert" className="border border-error/40 bg-error/5 px-3 py-2 text-xs text-error">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full justify-center">{submitting ? "Sending…" : error ? "Try again" : "Send reset link"}</Button>
        </form>
      )}
      <Link href="/login" className="mt-6 text-sm text-brass hover:underline">Back to sign in</Link>
    </AuthShell>
  );
}
