"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminStore } from "@/lib/admin/store";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const { login, currentUser, isReady } = useAdminAuth();
  const { adminUsers } = useAdminStore();
  const router = useRouter();
  const [email, setEmail] = useState("amaka@momen.studio");
  const [password, setPassword] = useState("momen2026");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isReady && currentUser) {
    router.replace("/admin");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setTimeout(() => {
      const result = login(email, password);
      if (!result.ok) setError(result.error);
      else router.push("/admin");
      setSubmitting(false);
    }, 350);
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

          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-[11px] font-medium text-ink/50">Demo accounts (password: momen2026)</p>
            <ul className="space-y-1 text-[11px] text-ink/45">
              {adminUsers.slice(0, 4).map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setEmail(u.email)} className="hover:text-brass">
                    {u.email} — {u.roleId.replace(/-/g, " ")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </form>

        <p className="mt-5 text-center text-[11px] text-ivory/30">
          Demo authentication only — passwords are stored in plain seed data for this prototype and must never be
          implemented this way in production.
        </p>
      </div>
    </div>
  );
}
