"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const { signup, currentUser, isReady } = useCustomerAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isReady && currentUser) {
    router.replace(next);
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setTimeout(() => {
      const result = signup({ name, email, password, phone: phone || undefined });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
      } else {
        router.push(next);
      }
    }, 300);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <p className="eyebrow text-clay">Join Momen</p>
        <h1 className="mt-2 font-display text-3xl">Create Your Account</h1>
        <p className="mt-2 text-sm text-ink/60">Save your measurements once, order made-to-measure pieces for life.</p>
      </div>

      <form onSubmit={handleSubmit} className="border border-line p-6">
        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink/60">Full Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
          </label>
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
            <span className="text-xs text-ink/60">Phone (optional)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink/60">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
            <span className="text-[11px] text-ink/40">At least 6 characters.</span>
          </label>
        </div>

        {error && <p className="mt-4 border border-error/40 bg-error/5 px-3 py-2 text-xs text-error">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-6 w-full justify-center">
          {submitting ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href={`/login${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brass hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-8 text-center text-[11px] text-ink/35">
        Demo authentication only — passwords are stored in plain seed/local data for this prototype and must never be
        implemented this way in production.
      </p>
    </div>
  );
}
