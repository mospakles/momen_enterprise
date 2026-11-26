"use client";

// The first-order offer, made hard to miss: a bar across the top of every
// storefront page and, once per browser, a pop-up a few seconds into the
// first visit. Claiming saves the code for checkout.

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { trapFocus, useDialog } from "@/lib/a11y";
import { campaignPhoto } from "@/lib/campaign-catalogue";
import { useCheckoutPrefs } from "@/lib/checkout-prefs";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { useScrollLock } from "@/lib/motion/hooks";
import { toast } from "@/lib/toast";
import { formatNaira } from "@/lib/format";
import { WELCOME_CODE, WELCOME_PERCENT, useWelcomeOffer, welcomeSaving } from "@/lib/welcome-offer";

const OPEN_EVENT = "momen:welcome-open";
const openWelcome = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Thin bar above the navigation. */
export function WelcomeBar() {
  const { barHidden, update } = useWelcomeOffer();
  if (barHidden) return null;
  return (
    <div className="relative bg-terracotta text-ivory">
      <div className="mx-auto flex min-h-9 max-w-[1600px] items-center justify-center gap-x-3 px-10 py-1.5 text-center text-[13px] leading-snug">
        <p>
          <span className="font-semibold">New here? {WELCOME_PERCENT}% off your first order</span>
          <span className="hidden sm:inline"> with code <span className="font-semibold tracking-wide">{WELCOME_CODE}</span></span>
        </p>
        <button type="button" onClick={openWelcome} className="shrink-0 underline underline-offset-4 hover:no-underline">
          Claim it
        </button>
      </div>
      <button type="button" onClick={() => update({ barHidden: true })} aria-label="Hide the welcome offer"
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-ivory/15">
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l8 8M10 2l-8 8" /></svg>
      </button>
    </div>
  );
}

/** Pop-up shown once to first-time visitors, and whenever the bar is clicked. */
export function WelcomeModal() {
  const pathname = usePathname() ?? "/";
  const { seen, update } = useWelcomeOffer();
  const { currentUser } = useCustomerAuth();
  const { update: updatePrefs } = useCheckoutPrefs();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    update({ seen: true });
  };
  const panel = useDialog<HTMLDivElement>(open, close);
  useScrollLock(open);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  // First visit: open after a few seconds, unless they're signed in or paying.
  const quiet = pathname.startsWith("/checkout") || pathname.startsWith("/login") || pathname.startsWith("/signup");
  useEffect(() => {
    if (seen || currentUser || quiet) return;
    const timer = window.setTimeout(() => setOpen(true), 3500);
    return () => window.clearTimeout(timer);
  }, [seen, currentUser, quiet]);

  function claim() {
    updatePrefs({ couponCode: WELCOME_CODE });
    close();
    toast(`${WELCOME_PERCENT}% off saved`, { description: "It comes off at checkout on your first order.", variant: "success" });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(WELCOME_CODE);
      setCopied(true);
    } catch {
      // clipboard blocked: the code is on screen to type
    }
  }

  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[95] grid place-items-center bg-night/55 p-4 backdrop-blur-[2px]" onClick={close}>
        <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="welcome-title" onKeyDown={trapFocus}
          onClick={(event) => event.stopPropagation()}
          className="grid w-full max-w-3xl overflow-hidden bg-ivory shadow-2xl md:grid-cols-2">
          <div className="relative hidden min-h-[460px] md:block">
            <Image src={campaignPhoto("cobalt-trousers-duo-front")} alt="" fill sizes="384px" className="object-cover object-[50%_25%]" />
          </div>
          <div className="relative flex flex-col justify-center p-7 sm:p-10">
            <button type="button" onClick={close} aria-label="Close"
              className="absolute right-3 top-3 grid size-10 place-items-center rounded-full hover:bg-ink/5">
              <svg aria-hidden width="14" height="14" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.3"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
            <p className="text-sm font-semibold text-terracotta">Welcome to momen.</p>
            <h2 id="welcome-title" className="display mt-3 text-5xl leading-[0.95] sm:text-6xl">{WELCOME_PERCENT}% off your first order</h2>
            <p className="mt-4 text-base leading-relaxed text-ink/75">
              Ready-to-Wear or Bespoke, your first piece is {WELCOME_PERCENT}% off. Use the code below at checkout.
            </p>
            <div className="mt-6 flex items-stretch border border-dashed border-ink/40">
              <span className="flex-1 px-4 py-3 text-lg font-semibold tracking-[0.2em]">{WELCOME_CODE}</span>
              <button type="button" onClick={() => void copy()} className="border-l border-dashed border-ink/40 px-4 text-sm font-medium hover:bg-ink/5">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button type="button" data-autofocus onClick={claim} className="mt-4 bg-ink px-6 py-3.5 text-sm font-medium text-ivory hover:bg-terracotta">
              Claim my {WELCOME_PERCENT}%
            </button>
            <button type="button" onClick={close} className="mt-3 self-center text-sm text-ink/60 underline underline-offset-4 hover:text-ink">
              No thanks
            </button>
            <p className="mt-4 text-xs text-ink/55">One use per customer, on your first order.</p>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/** One line under a price: what the piece costs with the welcome offer. */
export function WelcomeNote({ price, className = "" }: { price: number; className?: string }) {
  return (
    <p className={`text-sm text-terracotta ${className}`}>
      <span className="font-semibold">{formatNaira(price - welcomeSaving(price))}</span> on your first order: {WELCOME_PERCENT}% off with code{" "}
      <span className="font-semibold tracking-wide">{WELCOME_CODE}</span>
    </p>
  );
}
