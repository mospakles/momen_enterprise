"use client";

// The admin dashboard is a distinct application shell (its own sidebar/topbar
// come from `src/app/admin/layout.tsx`) — this keeps the storefront's
// Navbar/Footer from wrapping it. Checkout gets a quiet, distraction-free
// header with no main navigation.

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import StylistButton from "./StylistButton";
import FlyToBag from "@/components/shop/FlyToBag";
import { Wordmark } from "@/components/brand/Wordmark";

const BagDrawer = dynamic(() => import("@/components/shop/BagDrawer"), { ssr: false });
const SearchOverlay = dynamic(() => import("@/components/search/SearchOverlay"), { ssr: false });

export default function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/admin")) return <>{children}</>;

  const isCheckout = pathname === "/checkout" || pathname.startsWith("/checkout/payment-callback");
  if (isCheckout) {
    return (
      <>
        <header className="border-b border-line bg-ivory">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/cart" className="label link-line text-ink/60 hover:text-ink">
              ← Bag
            </Link>
            <Link href="/" aria-label="momen. — home" className="text-[1.9rem] leading-none">
              <Wordmark />
            </Link>
            <span className="label flex items-center gap-1.5 text-ink/60">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
                <rect x="2" y="5.5" width="8" height="5.5" rx="0.5" />
                <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
              </svg>
              <span className="hidden sm:inline">Secure checkout</span>
            </span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </>
    );
  }

  const isHome = pathname === "/";
  return (
    <>
      <Navbar />
      <main className={`flex-1 ${isHome ? "" : "pt-16 lg:pt-18"}`}>{children}</main>
      <Footer />
      <BagDrawer />
      <SearchOverlay />
      <FlyToBag />
      <StylistButton />
    </>
  );
}
