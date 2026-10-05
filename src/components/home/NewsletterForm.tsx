"use client";

import { FormEvent, useState } from "react";
import { toast } from "@/lib/toast";
import { apiRequest } from "@/lib/api";

export default function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast("Enter a valid email", { variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/newsletter/subscribe", { method: "POST", body: { email } });
      setSubmitting(false);
      setEmail("");
      toast("Welcome to the Momen List", { description: "You're subscribed.", variant: "success" });
    } catch (error) {
      setSubmitting(false);
      toast("Could not subscribe", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex ${compact ? "max-w-xs" : "mx-auto max-w-md"} gap-0`}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        className={`w-full border-b bg-transparent px-1 py-2 text-sm outline-none placeholder:text-current/50 ${
          compact ? "border-ink/30 text-ink" : "border-ivory/40 text-ivory"
        }`}
      />
      <button
        type="submit"
        disabled={submitting}
        className={`shrink-0 border-b px-3 text-xs uppercase tracking-widest disabled:opacity-50 ${
          compact ? "border-ink/30 text-ink hover:text-brass" : "border-ivory/40 text-ivory hover:text-brass-light"
        }`}
      >
        {submitting ? "…" : "Join"}
      </button>
    </form>
  );
}
