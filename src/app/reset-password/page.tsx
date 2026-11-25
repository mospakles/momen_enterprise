"use client";
import AuthShell from "@/components/auth/AuthShell";
import { MEDIA } from "@/components/journey/media";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";

function ResetContent() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/auth/password-reset/confirm", { method: "POST", body: { token, newPassword: password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The reset link is invalid or expired.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthShell image={MEDIA.auth.recover}>
      <p className="eyebrow text-clay">Account recovery</p>
      <h1 className="mt-2 font-display text-3xl">Choose a new password</h1>
      {done ? (
        <>
          <p className="mt-4 text-sm text-ink/70">Your password has been reset. You can now sign in.</p>
          <Link href="/login" className="mt-6 text-sm text-brass hover:underline">Sign in</Link>
        </>
      ) : !token ? (
        <>
          <p className="mt-4 text-sm text-ink/70">This reset link is incomplete. Open the link from your email again, or request a new one.</p>
          <Link href="/forgot-password" className="mt-6 text-sm text-brass hover:underline">Request a new link</Link>
        </>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 border border-line p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink/60">New password</span>
            <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass" />
            <span className="text-[11px] text-ink/40">At least 8 characters.</span>
          </label>
          {error && (
            <p role="alert" className="border border-error/40 bg-error/5 px-3 py-2 text-xs text-error">
              {error}{" "}
              <Link href="/forgot-password" className="underline">Request a new link</Link>
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full justify-center">{submitting ? "Resetting…" : "Reset password"}</Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() { return <Suspense><ResetContent /></Suspense>; }
