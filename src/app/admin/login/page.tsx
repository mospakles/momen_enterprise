"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const { login, currentUser, isReady } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && currentUser) router.replace("/admin");
  }, [currentUser, isReady, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(email, password, twoFactorCode || undefined);
    if (!result.ok) setError(result.error);
    else router.push("/admin");
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl text-ivory">
            Momen <span className="text-brass-light">Admin</span>
          </p>
          <p className="mt-1.5 text-sm text-ivory/50">Sign in to the business operating system.</p>
        </div>

        <form onSubmit={handleSubmit} className="border border-ivory/10 bg-ivory p-6">
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/60">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/60">Two-factor code (if enabled)</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/60">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
              />
            </label>
          </div>

          {error && <p className="mt-4 border border-error/40 bg-error/5 px-3 py-2 text-xs text-error">{error}</p>}

          <Button type="submit" disabled={submitting} className="mt-6 w-full justify-center">
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
          <Link href="/admin/forgot-password" className="mt-4 block text-center text-xs text-brass hover:underline">
            Forgot your password?
          </Link>

        </form>
      </div>
    </div>
  );
}
