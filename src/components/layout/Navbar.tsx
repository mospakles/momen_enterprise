"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Portal } from "@/components/ui/Portal";
import { trapFocus, useDialog } from "@/lib/a11y";
import { useCart } from "@/lib/cart-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { useScrollLock } from "@/lib/motion/hooks";
import { useUI } from "@/lib/ui-context";
import { WelcomeBar } from "./WelcomeOffer";

const links = [
  { href: "/shop", label: "Ready-to-Wear" },
  { href: "/made-to-measure", label: "Bespoke" },
  { href: "/collections", label: "Collections" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const iconClass = "relative grid size-10 shrink-0 place-items-center rounded-full hover:bg-ink/5";

export default function Navbar() {
  const pathname = usePathname();
  const { count } = useCart();
  const { currentUser } = useCustomerAuth();
  const { openBag, openSearch, bagIconRef } = useUI();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const menu = useDialog<HTMLDivElement>(open, close);
  useScrollLock(open);
  const wishlistHref = currentUser ? "/account?tab=Wishlist" : "/wishlist";
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  // Page content starts below the header, whose height changes when the
  // welcome bar is shown or hidden.
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const sync = () => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <header ref={header} className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ivory">
        <WelcomeBar />
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:h-18 lg:px-10">
          <div className="flex items-center">
            <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-haspopup="dialog" className={`${iconClass} -ml-2 xl:hidden`}>
              <Icon name="menu" />
            </button>
            <NavLinks links={links.slice(0, 3)} active={active} label="Primary" />
          </div>
          <Link href="/" aria-label="momen. home" className="text-[1.85rem] leading-none lg:text-[2.25rem]"><Wordmark /></Link>
          <div className="flex items-center justify-end gap-6">
            <NavLinks links={links.slice(3)} active={active} label="More" />
            <div className="flex items-center gap-1">
              <button type="button" onClick={openSearch} aria-label="Search" className={iconClass}><Icon name="search" /></button>
              <Link href={wishlistHref} aria-label="Wishlist" className={`${iconClass} hidden sm:grid`}><Icon name="heart" /></Link>
              <Link href="/account" aria-label={currentUser ? "Account" : "Sign in"} className={`${iconClass} hidden sm:grid`}><Icon name="user" /></Link>
              <button ref={bagIconRef} type="button" onClick={openBag} aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`} className={iconClass}>
                <Icon name="bag" />
                {count > 0 && <span className="absolute right-0 top-0 rounded-full bg-ink px-1.5 text-[11px] text-ivory">{count}</span>}
              </button>
            </div>
          </div>
        </div>
      </header>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[90] bg-night/40 xl:hidden" onClick={close}>
            <div ref={menu} role="dialog" aria-modal="true" aria-label="Navigation" onClick={(event) => event.stopPropagation()}
              onKeyDown={trapFocus} className="h-full w-full max-w-sm overflow-y-auto bg-ivory px-6 pb-8">
              <div className="mb-5 flex h-16 items-center justify-between border-b border-line">
                <Link href="/" onClick={close} aria-label="momen. home" className="text-[1.8rem]"><Wordmark /></Link>
                <button data-autofocus type="button" onClick={close} className="px-3 py-2 text-sm">Close</button>
              </div>
              <nav aria-label="Mobile">
                {links.map(({ href, label }) => (
                  <Link key={href} href={href} onClick={close} aria-current={active(href) ? "page" : undefined}
                    className="block border-b border-line py-4 font-display text-2xl hover:text-terracotta">{label}</Link>
                ))}
                <div className="mt-7 flex gap-6 text-sm">
                  <Link href="/account" onClick={close}>{currentUser ? "Account" : "Sign in"}</Link>
                  <Link href={wishlistHref} onClick={close}>Wishlist</Link>
                  <Link href="/measurements" onClick={close}>Size &amp; fit</Link>
                </div>
              </nav>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

function NavLinks({ links: items, active, label }: { links: typeof links; active: (href: string) => boolean; label: string }) {
  return (
    <nav aria-label={label} className="hidden items-center gap-6 xl:flex">
      {items.map(({ href, label: text }) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
          className={`whitespace-nowrap py-3 text-sm font-medium hover:underline hover:underline-offset-4 ${active(href) ? "text-ink underline underline-offset-4" : "text-ink/75"}`}>
          {text}
        </Link>
      ))}
    </nav>
  );
}

const paths = {
  menu: "M3 6h14M3 10h14M3 14h14",
  search: "M15.25 9a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0ZM17 17l-3.6-3.6",
  heart: "M10 17s-7-4.7-7-8.7a3.6 3.6 0 0 1 7-1.3 3.6 3.6 0 0 1 7 1.3c0 4-7 8.7-7 8.7Z",
  user: "M13.25 6.5a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0ZM3.5 17a6.8 6.8 0 0 1 13 0",
  bag: "M5 7.5h10l.8 10H4.2l.8-10ZM7.2 7.5V6a2.8 2.8 0 0 1 5.6 0v1.5",
} as const;

function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
