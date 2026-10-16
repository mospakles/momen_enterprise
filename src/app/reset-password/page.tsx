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
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("/auth/password-reset/confirm", { method: "POST", body: { token, newPassword: password } });
      setMessage("Your password has been reset. You can now sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The reset link is invalid or expired.");
    } finally { setSubmitting(false); }
  }
  return <AuthShell image={MEDIA.auth.recover}><p className="eyebrow text-clay">Account recovery</p><h1 className="mt-2 font-display text-3xl">Choose a new password</h1>{message ? <><p className="mt-4 text-sm text-ink/70">{message}</p><Link href="/login" className="mt-6 text-sm text-brass hover:underline">Sign in</Link></> : <form onSubmit={submit} className="mt-6 space-y-4 border border-line p-6"><label className="flex flex-col gap-1.5"><span className="text-xs text-ink/60">New password</span><input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass" /></label><Button type="submit" disabled={submitting || !token} className="w-full justify-center">{submitting ? "Resetting…" : "Reset password"}</Button></form>}</AuthShell>;
}

export default function ResetPasswordPage() { return <Suspense><ResetContent /></Suspense>; }
