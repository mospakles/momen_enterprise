"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { m } from "motion/react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAdminStore } from "@/lib/admin/store";
import { Wordmark } from "@/components/brand/Wordmark";
import { EASE_HOUSE } from "@/lib/motion/ease";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All pieces" },
      { href: "/collections", label: "Collections" },
      { href: "/collections/new-arrivals", label: "New arrivals" },
      { href: "/accessories", label: "Accessories" },
      { href: "/made-to-measure", label: "Bespoke" },
    ],
  },
  {
    title: "The house",
    links: [
      { href: "/about", label: "About momen." },
      { href: "/journal", label: "Journal" },
      { href: "/measurements", label: "Measure at home" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Care",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/shipping-policy", label: "Delivery" },
      { href: "/returns-policy", label: "Returns & exchanges" },
      { href: "/account", label: "Your account" },
      { href: "/admin/login", label: "Admin login" },
    ],
  },
];

export default function Footer() {
  const { systemSettings } = useAdminStore();
  const general = systemSettings.general;
  const phone = (general.supportPhone ?? "").replace(/[^\d]/g, "");
  const socials = [
    { label: "Instagram", href: general.instagram },
    { label: "TikTok", href: general.tiktok },
    { label: "Pinterest", href: general.pinterest },
    { label: "WhatsApp", href: phone ? `https://wa.me/${phone}` : "" },
  ].filter((s) => s.href);

  return (
    <footer data-tone="dark" className="relative overflow-hidden bg-night text-bone">
      <div className="mx-auto max-w-[1600px] px-5 pt-24 sm:px-10 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="label text-sand">Join the house</p>
            <h2 className="display mt-5 max-w-[16ch] text-[clamp(2.2rem,4vw,3.5rem)]">New cloth, first fittings, quiet notes from Lagos.</h2>
            <JoinForm />
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="label mb-5 text-sand">{col.title}</p>
                <ul className="space-y-3 text-sm text-bone/70">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="link-line transition-colors hover:text-bone">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-bone/10 pt-8 text-xs text-bone/55 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {socials.length > 0 ? (
              socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="label link-line text-bone/70 hover:text-bone">
                  {s.label}
                </a>
              ))
            ) : (
              <span className="label">Lagos, Nigeria</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy-policy" className="hover:text-bone">Privacy</Link>
            <Link href="/terms-and-conditions" className="hover:text-bone">Terms</Link>
            <span>© {new Date().getFullYear()} momen. All rights reserved.</span>
          </div>
        </div>
      </div>

      {/* Oversized wordmark, cropped by the page edge */}
      <m.div
        aria-hidden
        className="pointer-events-none mt-10 select-none px-3 leading-[0.72]"
        initial={{ y: "30%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.4, ease: EASE_HOUSE }}
      >
        <Wordmark fluid className="text-bone/[0.07]" />
      </m.div>
    </footer>
  );
}

function JoinForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("That email doesn't look right — check for a typo.");
      return;
    }
    setError(null);
    setState("sending");
    try {
      await apiRequest("/newsletter/subscribe", { method: "POST", body: { email } });
      setState("done");
      setEmail("");
      toast("Welcome to the house", { description: "You'll hear from us when there's something worth saying.", variant: "success" });
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "We couldn't add you just now. Please try again.");
    }
  }

  if (state === "done") {
    return <p className="mt-8 max-w-md border-b border-bone/30 pb-3 text-sm text-bone/80">You&rsquo;re on the list. Welcome to the house.</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 max-w-md">
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <div className="flex items-end border-b border-bone/30 transition-colors focus-within:border-bone">
        <input
          id="footer-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "footer-email-error" : undefined}
          className="w-full bg-transparent py-3 text-base text-bone outline-none placeholder:text-bone/40"
        />
        <button type="submit" disabled={state === "sending"} className="label shrink-0 py-3 pl-4 text-bone transition-opacity hover:opacity-70 disabled:opacity-40">
          {state === "sending" ? "Joining…" : "Join →"}
        </button>
      </div>
      {error && (
        <p id="footer-email-error" role="alert" className="mt-2 text-xs text-terracotta-light">
          {error}
        </p>
      )}
    </form>
  );
}
