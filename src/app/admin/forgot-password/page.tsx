"use client";

import { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); await apiRequest("/admin/auth/password-reset/request", { method: "POST", body: { email } }).catch(() => undefined); setSent(true); }
  return <div className="flex min-h-screen items-center justify-center bg-ink px-4"><div className="w-full max-w-sm"><p className="font-display text-2xl text-ivory">Momen <span className="text-brass-light">Admin</span></p><h1 className="mt-5 font-display text-2xl text-ivory">Reset your password</h1>{sent ? <p className="mt-4 text-sm text-ivory/60">If your account exists, a reset link has been sent.</p> : <form onSubmit={submit} className="mt-6 space-y-4 bg-ivory p-6"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full border border-line px-3 py-2.5 text-sm"/><Button type="submit" className="w-full justify-center">Send reset link</Button></form>}<Link href="/admin/login" className="mt-5 block text-sm text-brass-light hover:underline">Back to admin sign in</Link></div></div>;
}
