"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAdminStore } from "@/lib/admin/store";
import { useCustomerAuth } from "@/lib/customer-auth-context";

const CLOTHING_CATEGORIES = ["kaftans", "senator", "agbada", "jalabia", "shirts", "pants", "casual-wear"];
const ACCESSORY_CATEGORIES = ["footwear", "belts", "bags", "caps", "other-accessories"];
const COLLECTION_ORDER = ["new-arrivals", "signature", "occasion", "everyday", "heritage", "contemporary", "limited-edition"];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaMenu, setMegaMenu] = useState<"clothing" | "accessories" | "collections" | null>(null);
  const pathname = usePathname();
  const { count, wishlist } = useCart();
  const { categories, collections } = useAdminStore();
  const { currentUser } = useCustomerAuth();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close mobile/mega menus on navigation
    setOpen(false);
    setMegaMenu(null);
  }, [pathname]);

  const isAdmin = pathname?.startsWith("/admin");
  if (isAdmin) return null;

  const clothingLinks = CLOTHING_CATEGORIES.map((slug) => categories.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const accessoryLinks = ACCESSORY_CATEGORIES.map((slug) => categories.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const collectionLinks = COLLECTION_ORDER.map((slug) => collections.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c));

  function openMenu(menu: typeof megaMenu) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaMenu(menu);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setMegaMenu(null), 150);
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled ? "border-line bg-ivory/95 backdrop-blur" : "border-transparent bg-ivory"
      }`}
      onMouseLeave={scheduleClose}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col gap-1.5 lg:hidden"
        >
          <span className={`h-px w-5 bg-ink transition-transform ${open ? "translate-y-[3px] rotate-45" : ""}`} />
          <span className={`h-px w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-px w-5 bg-ink transition-transform ${open ? "-translate-y-[3px] -rotate-45" : ""}`} />
        </button>

        <Link href="/" className="font-display text-2xl tracking-[0.08em] text-ink">
          MOMEN
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <Link href="/collections/new-arrivals" className="eyebrow text-ink/70 transition-colors hover:text-brass">
            New Arrivals
          </Link>

          <div className="relative" onMouseEnter={() => openMenu("clothing")}>
            <Link href="/shop" className="eyebrow flex items-center gap-1 text-ink/70 transition-colors hover:text-brass">
              Clothing <Chevron />
            </Link>
            {megaMenu === "clothing" && (
              <MegaPanel>
                {clothingLinks.map((c) => (
                  <Link key={c.slug} href={`/shop?category=${c.slug}`} className="block px-4 py-2 text-sm text-ink/75 hover:bg-ivory-deep/50 hover:text-brass">
                    {c.name}
                  </Link>
                ))}
                <Link href="/shop?category=casual-wear&tag=two-piece" className="block px-4 py-2 text-sm text-ink/75 hover:bg-ivory-deep/50 hover:text-brass">
                  Two-Piece Sets
                </Link>
              </MegaPanel>
            )}
          </div>

          <div className="relative" onMouseEnter={() => openMenu("collections")}>
            <button className="eyebrow flex items-center gap-1 text-ink/70 transition-colors hover:text-brass">
              Collections <Chevron />
            </button>
            {megaMenu === "collections" && (
              <MegaPanel>
                {collectionLinks.map((c) => (
                  <Link key={c.slug} href={`/collections/${c.slug}`} className="block px-4 py-2 text-sm text-ink/75 hover:bg-ivory-deep/50 hover:text-brass">
                    {c.name}
                  </Link>
                ))}
              </MegaPanel>
            )}
          </div>

          <Link href="/made-to-measure" className="eyebrow text-brass transition-colors hover:text-ink">
            Made-to-Measure
          </Link>

          <div className="relative" onMouseEnter={() => openMenu("accessories")}>
            <Link href="/accessories" className="eyebrow flex items-center gap-1 text-ink/70 transition-colors hover:text-brass">
              Accessories <Chevron />
            </Link>
            {megaMenu === "accessories" && (
              <MegaPanel>
                {accessoryLinks.map((c) => (
                  <Link key={c.slug} href={`/shop?category=${c.slug}`} className="block px-4 py-2 text-sm text-ink/75 hover:bg-ivory-deep/50 hover:text-brass">
                    {c.name}
                  </Link>
                ))}
              </MegaPanel>
            )}
          </div>

          <Link href="/unisex" className="eyebrow text-ink/70 transition-colors hover:text-brass">
            Unisex
          </Link>
          <Link href="/about" className="eyebrow text-ink/70 transition-colors hover:text-brass">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-4 sm:gap-5">
          <Link href="/shop" aria-label="Search" className="hidden sm:block text-ink/70 hover:text-brass">
            <SearchIcon />
          </Link>
          <Link href="/account?tab=Wishlist" aria-label="Wishlist" className="relative hidden text-ink/70 hover:text-brass sm:block">
            <HeartIcon />
            {wishlist.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[10px] font-semibold text-ivory">
                {wishlist.length}
              </span>
            )}
          </Link>
          <Link href="/account" aria-label={currentUser ? `Account — ${currentUser.name}` : "Sign in"} className="relative text-ink/70 hover:text-brass">
            <UserIcon />
            {currentUser && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brass" />}
          </Link>
          <Link href="/cart" aria-label="Shopping bag" className="relative text-ink/70 hover:text-brass">
            <BagIcon />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[10px] font-semibold text-ivory">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-ivory px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col">
            <Link href="/collections/new-arrivals" className="border-b border-line py-3 font-display text-lg text-ink">
              New Arrivals
            </Link>
            <MobileGroup label="Clothing" labelHref="/shop" links={clothingLinks.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.name }))} />
            <MobileGroup label="Collections" links={collectionLinks.map((c) => ({ href: `/collections/${c.slug}`, label: c.name }))} />
            <Link href="/made-to-measure" className="border-b border-line py-3 font-display text-lg text-brass">
              Made-to-Measure
            </Link>
            <MobileGroup label="Accessories" labelHref="/accessories" links={accessoryLinks.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.name }))} />
            <Link href="/unisex" className="border-b border-line py-3 font-display text-lg text-ink">
              Unisex
            </Link>
            <Link href="/about" className="border-b border-line py-3 font-display text-lg text-ink">
              About
            </Link>
            <Link href="/account?tab=Wishlist" className="border-b border-line py-3 font-display text-lg text-ink">
              Wishlist
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function MegaPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="fade-up absolute left-1/2 top-full z-20 mt-3 w-56 -translate-x-1/2 border border-line bg-ivory py-2 shadow-xl">
      {children}
    </div>
  );
}

function MobileGroup({ label, links, labelHref }: { label: string; links: { href: string; label: string }[]; labelHref?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <div className="flex w-full items-center justify-between py-3">
        {labelHref ? (
          <Link href={labelHref} className="font-display text-lg text-ink">
            {label}
          </Link>
        ) : (
          <span className="font-display text-lg text-ink">{label}</span>
        )}
        <button onClick={() => setOpen((v) => !v)} aria-label={`Toggle ${label} subcategories`} className="p-1 text-sm text-ink/40 transition-transform">
          <span className={`inline-block transition-transform ${open ? "rotate-45" : ""}`}>+</span>
        </button>
      </div>
      {open && (
        <div className="flex flex-col pb-3 pl-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="py-2 text-sm text-ink/70 hover:text-brass">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" className="mt-px">
      <path d="M2 3.5 5 6.5 8 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="9" cy="9" r="6.25" />
      <path d="M17 17l-3.8-3.8" strokeLinecap="round" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 17s-6.2-4-8.3-7.7C.4 6.9 1.7 4 4.5 3.5c1.9-.4 3.7.5 5 2.2 1.3-1.7 3.1-2.6 5-2.2 2.8.5 4.1 3.4 2.8 5.8C16.2 13 10 17 10 17Z" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="6.5" r="3.25" />
      <path d="M3.5 17c1.2-3.4 4-5 6.5-5s5.3 1.6 6.5 5" strokeLinecap="round" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M5 7.5h10l.8 10a1.5 1.5 0 0 1-1.5 1.5H5.7A1.5 1.5 0 0 1 4.2 17.5L5 7.5Z" strokeLinejoin="round" />
      <path d="M7.2 7.5V6a2.8 2.8 0 0 1 5.6 0v1.5" strokeLinecap="round" />
    </svg>
  );
}
