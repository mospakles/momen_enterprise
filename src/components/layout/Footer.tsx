"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsletterForm from "@/components/home/NewsletterForm";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-line bg-ivory-deep">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr_1.2fr]">
          <div>
            <p className="font-display text-2xl">Momen</p>
            <p className="mt-3 max-w-xs text-sm text-ink/70">
              Made-to-measure clothing, cut to your exact form and shipped from Lagos.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-4">Shop</p>
            <ul className="space-y-2 text-sm text-ink/70">
              <li><Link href="/shop" className="hover:text-brass">All Products</Link></li>
              <li><Link href="/collections" className="hover:text-brass">Collections</Link></li>
              <li><Link href="/measurements" className="hover:text-brass">Made-to-Measure</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4">Company</p>
            <ul className="space-y-2 text-sm text-ink/70">
              <li><Link href="/about" className="hover:text-brass">About Momen</Link></li>
              <li><Link href="/journal" className="hover:text-brass">Journal</Link></li>
              <li><Link href="/faq" className="hover:text-brass">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-brass">Contact</Link></li>
              <li><Link href="/account" className="hover:text-brass">Account</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4">Legal</p>
            <ul className="space-y-2 text-sm text-ink/70">
              <li><Link href="/shipping-policy" className="hover:text-brass">Shipping</Link></li>
              <li><Link href="/returns-policy" className="hover:text-brass">Returns</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-brass">Privacy Policy</Link></li>
              <li><Link href="/terms-and-conditions" className="hover:text-brass">Terms</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4">Join the Momen List</p>
            <p className="mb-4 text-sm text-ink/70">
              Be the first to discover new collections, exclusive pieces, and Momen stories.
            </p>
            <NewsletterForm compact />
          </div>
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 text-xs text-ink/50 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Momen. All rights reserved.</p>
          <p>Lagos, Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
