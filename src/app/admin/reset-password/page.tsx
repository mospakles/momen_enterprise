"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";

function AdminResetContent() {
  const token = useSearchParams().get("token") ?? ""; const [password, setPassword] = useState(""); const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent) { event.preventDefault(); try { await apiRequest("/admin/auth/password-reset/confirm", { method: "POST", body: { token, newPassword: password } }); setMessage("Password reset. You can now sign in."); } catch (error) { setMessage(error instanceof Error ? error.message : "The reset link is invalid or expired."); } }
  return <div className="flex min-h-screen items-center justify-center bg-ink px-4"><div className="w-full max-w-sm bg-ivory p-6"><h1 className="font-display text-2xl">Set a new admin password</h1>{message ? <p className="mt-4 text-sm text-ink/70">{message}</p> : <form onSubmit={submit} className="mt-5 space-y-4"><input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full border border-line px-3 py-2.5 text-sm"/><Button type="submit" disabled={!token} className="w-full justify-center">Reset password</Button></form>}<Link href="/admin/login" className="mt-5 block text-sm text-brass hover:underline">Back to admin sign in</Link></div></div>;
}
export default function AdminResetPasswordPage() { return <Suspense><AdminResetContent /></Suspense>; }
