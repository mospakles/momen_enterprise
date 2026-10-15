"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useCart } from "@/lib/cart-context";
import { useAdminStore } from "@/lib/admin/store";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { useUI } from "@/lib/ui-context";
import { OCCASIONS } from "@/lib/occasions";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { useScrollLock } from "@/lib/motion/hooks";
import { Wordmark } from "@/components/brand/Wordmark";
import { trapFocus, useDialog } from "@/lib/a11y";
import { Portal } from "@/components/ui/Portal";

const CLOTHING_CATEGORIES = ["kaftans", "senator", "agbada", "jalabia", "shirts", "pants", "casual-wear"];
const ACCESSORY_CATEGORIES = ["footwear", "belts", "bags", "caps", "other-accessories"];
const COLLECTION_ORDER = ["new-arrivals", "signature", "occasion", "everyday", "heritage", "contemporary", "limited-edition"];

type Menu = "shop" | "collections" | null;

export default function Navbar() {
  const pathname = usePathname();
  const { count, wishlist } = useCart();
  const { categories, collections, products } = useAdminStore();
  const { currentUser } = useCustomerAuth();
  const { openBag, openSearch, bagIconRef, setHeaderHidden } = useUI();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useScrollLock(mobileOpen);

  // Hide on scroll down, reveal on scroll up; solid once off the very top.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setAtTop(y < 24);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 140);
        last = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menus on navigation
    setMobileOpen(false);
    setMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!menu && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, mobileOpen]);

  const isHome = pathname === "/";
  const overHero = isHome && atTop && !menu && !mobileOpen;
  const visible = !hidden || Boolean(menu) || mobileOpen;

  useEffect(() => {
    setHeaderHidden(!visible);
  }, [visible, setHeaderHidden]);

  const bySlug = (slugs: string[], list: typeof categories) =>
    slugs.map((slug) => list.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const clothing = bySlug(CLOTHING_CATEGORIES, categories);
  const accessories = bySlug(ACCESSORY_CATEGORIES, categories);
  const collectionLinks = COLLECTION_ORDER.map((slug) => collections.find((c) => c.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );
  const featured = products.find((p) => p.isSignature && p.publishStatus === "published") ?? products[0];

  function openMenu(next: Menu) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu(next);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setMenu(null), 180);
  }

  const tone = overHero ? "text-bone" : "text-ink";
  const navLink = `label link-line inline-block py-2 transition-colors duration-500 ${overHero ? "text-bone/85 hover:text-bone" : "text-ink/75 hover:text-ink"}`;

  return (
    <>
      <m.header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,color] duration-500 ${
          overHero ? "border-b border-transparent bg-transparent" : "border-b border-line/70 bg-ivory/92 backdrop-blur-md"
        } ${tone}`}
        initial={false}
        animate={{ y: visible ? 0 : "-100%" }}
        transition={{ duration: 0.5, ease: EASE_HOUSE }}
        onMouseLeave={scheduleClose}
        data-tone={overHero ? "dark" : undefined}
      >
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:h-18 lg:px-10">
          {/* Left */}
          <div className="flex items-center gap-4 lg:gap-7">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen(true)}
              className="-ml-2 flex h-10 w-10 flex-col items-center justify-center gap-[5px] lg:hidden"
            >
              <span className="h-px w-5 bg-current" />
              <span className="h-px w-5 bg-current" />
            </button>
            <Link href="/shop" className={`${navLink} -ml-4 lg:hidden`}>
              Shop
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
              <div onMouseEnter={() => openMenu("shop")}>
                <Link href="/shop" className={navLink} aria-expanded={menu === "shop"} onFocus={() => openMenu("shop")}>
                  Shop
                </Link>
              </div>
              <div onMouseEnter={() => openMenu("collections")}>
                <button
                  type="button"
                  className={navLink}
                  aria-expanded={menu === "collections"}
                  aria-controls="mega-collections"
                  onClick={() => setMenu((m) => (m === "collections" ? null : "collections"))}
                >
                  Collections
                </button>
              </div>
              <Link href="/shop?category=women" className={navLink} onMouseEnter={() => setMenu(null)}>
                Women
              </Link>
              <Link href="/made-to-measure" className={navLink} onMouseEnter={() => setMenu(null)}>
                Bespoke
              </Link>
              <Link href="/about" className={navLink} onMouseEnter={() => setMenu(null)}>
                The House
              </Link>
            </nav>
          </div>

          {/* Centre */}
          <Link href="/" aria-label="momen. — home" className="justify-self-center text-[1.7rem] leading-none sm:text-[1.9rem] lg:text-[2.2rem]">
            <Wordmark />
          </Link>

          {/* Right */}
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <IconButton label="Search" onClick={openSearch}>
              <SearchIcon />
            </IconButton>
            <IconLink href="/account?tab=Wishlist" label={`Wishlist${wishlist.length ? `, ${wishlist.length} saved` : ""}`} className="hidden sm:flex">
              <HeartIcon />
              {wishlist.length > 0 && <Badge value={wishlist.length} inverted={overHero} />}
            </IconLink>
            <IconLink href="/account" label={currentUser ? `Account — ${currentUser.name}` : "Sign in"} className="hidden sm:flex">
              <UserIcon />
              {currentUser && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-terracotta" />}
            </IconLink>
            <button
              ref={bagIconRef}
              type="button"
              onClick={openBag}
              aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 active:scale-95"
            >
              <BagIcon />
              {count > 0 && <Badge value={count} inverted={overHero} />}
            </button>
          </div>
        </div>

        {/* Mega menus */}
        <AnimatePresence>
          {menu && (
            <m.div
              key="mega"
              id={menu === "collections" ? "mega-collections" : "mega-shop"}
              className="absolute inset-x-0 top-full hidden overflow-hidden border-b border-line bg-ivory text-ink lg:block"
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.55, ease: EASE_HOUSE }}
              onMouseEnter={() => openMenu(menu)}
            >
              {menu === "shop" ? (
                <MegaShop clothing={clothing} accessories={accessories} featured={featured} />
              ) : (
                <MegaCollections collections={collectionLinks} />
              )}
            </m.div>
          )}
        </AnimatePresence>
      </m.header>

      {/* Dim the page under an open mega menu */}
      <AnimatePresence>
        {menu && (
          <m.div
            aria-hidden
            className="fixed inset-0 z-40 hidden bg-night/25 lg:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseEnter={scheduleClose}
          />
        )}
      </AnimatePresence>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        clothing={clothing}
        accessories={accessories}
        collections={collectionLinks}
        signedIn={Boolean(currentUser)}
        wishlistCount={wishlist.length}
      />
    </>
  );
}

type Cat = { slug: string; name: string; image?: string };

function MegaShop({ clothing, accessories, featured }: { clothing: Cat[]; accessories: Cat[]; featured?: { slug: string; name: string; images: string[] } }) {
  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-10 px-10 py-12">
      <MegaColumn title="Clothing" className="col-span-3">
        <MegaLink href="/shop">Everything</MegaLink>
        {clothing.map((c) => (
          <MegaLink key={c.slug} href={`/shop?category=${c.slug}`}>
            {c.name}
          </MegaLink>
        ))}
      </MegaColumn>
      <MegaColumn title="Accessories" className="col-span-2">
        {accessories.map((c) => (
          <MegaLink key={c.slug} href={`/shop?category=${c.slug}`}>
            {c.name}
          </MegaLink>
        ))}
      </MegaColumn>
      <MegaColumn title="By occasion" className="col-span-2">
        {OCCASIONS.map((o) => (
          <MegaLink key={o.slug} href={o.href}>
            {o.label}
          </MegaLink>
        ))}
      </MegaColumn>
      {featured && (
        <Link href={`/product/${featured.slug}`} className="group col-span-5 grid grid-cols-2 gap-6" data-cursor="View">
          <div className="relative aspect-[4/5] overflow-hidden bg-bone">
            <Image src={featured.images[0]} alt={featured.name} fill sizes="20vw" className="object-cover transition-transform duration-[1.2s] ease-house group-hover:scale-105" />
          </div>
          <div className="flex flex-col justify-end">
            <p className="label text-clay">Featured look</p>
            <p className="display mt-3 text-3xl">{featured.name}</p>
            <span className="label link-line mt-5 self-start">View the piece</span>
          </div>
        </Link>
      )}
    </div>
  );
}

function MegaCollections({ collections }: { collections: (Cat & { description?: string })[] }) {
  const [hovered, setHovered] = useState(0);
  const current = collections[hovered];
  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-10 px-10 py-12">
      <ul className="col-span-5 space-y-1">
        {collections.map((c, i) => (
          <li key={c.slug}>
            <Link
              href={`/collections/${c.slug}`}
              onMouseEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              className={`display block py-1 text-4xl transition-[color,transform] duration-500 ease-house ${hovered === i ? "translate-x-2 text-ink" : "text-ink/35"}`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      <div className="col-span-7 grid grid-cols-[1.4fr_1fr] gap-8">
        <div className="relative aspect-[16/11] overflow-hidden bg-bone">
          <AnimatePresence initial={false}>
            {current?.image && (
              <m.div
                key={current.slug}
                className="absolute inset-0"
                initial={{ clipPath: "inset(0 0 0 100%)" }}
                animate={{ clipPath: "inset(0 0 0 0%)" }}
                exit={{ opacity: 0, transition: { delay: 0.5, duration: 0.2 } }}
                transition={{ duration: 0.7, ease: EASE_HOUSE }}
              >
                <Image src={current.image} alt="" fill sizes="35vw" className="object-cover" />
              </m.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col justify-end">
          <p className="label text-clay">Collection</p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{current?.description}</p>
          <Link href="/collections" className="label link-line mt-6 self-start">
            All collections
          </Link>
        </div>
      </div>
    </div>
  );
}

function MegaColumn({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="label mb-5 text-clay">{title}</p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function MegaLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="link-line text-[0.95rem] text-ink/75 transition-colors hover:text-ink">
        {children}
      </Link>
    </li>
  );
}

function MobileMenu({
  open,
  onClose,
  clothing,
  accessories,
  collections,
  signedIn,
  wishlistCount,
}: {
  open: boolean;
  onClose: () => void;
  clothing: Cat[];
  accessories: Cat[];
  collections: Cat[];
  signedIn: boolean;
  wishlistCount: number;
}) {
  const [section, setSection] = useState<"clothing" | "collections" | "accessories" | null>(null);
  const panel = useDialog<HTMLDivElement>(open, onClose);

  const primary = [
    { label: "Shop all", href: "/shop" },
    { label: "Clothing", key: "clothing" as const },
    { label: "Collections", key: "collections" as const },
    { label: "Accessories", key: "accessories" as const },
    { label: "Women", href: "/shop?category=women" },
    { label: "Bespoke", href: "/made-to-measure" },
    { label: "The House", href: "/about" },
  ];
  const sub = section === "clothing" ? clothing : section === "accessories" ? accessories : section === "collections" ? collections : [];

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <m.div
          ref={panel}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-tone="dark"
          className="fixed inset-0 z-[90] flex flex-col bg-night text-bone lg:hidden"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.7, ease: EASE_HOUSE }}
          onKeyDown={(e) => trapFocus(e)}
        >
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <Wordmark className="text-[1.9rem]" />
            <button data-autofocus type="button" onClick={onClose} aria-label="Close menu" className="label px-2 py-3 text-bone/80">
              Close
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 pb-10 pt-8 sm:px-8">
            <ul>
              {primary.map((item, i) => (
                <m.li
                  key={item.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05, duration: 0.8, ease: EASE_HOUSE }}
                  className="border-b border-bone/10"
                >
                  {item.href ? (
                    <Link href={item.href} className="display block py-3 text-[2.6rem] leading-tight">
                      {item.label}
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-expanded={section === item.key}
                        onClick={() => setSection((s) => (s === item.key ? null : item.key!))}
                        className="display flex w-full items-center justify-between py-3 text-left text-[2.6rem] leading-tight"
                      >
                        {item.label}
                        <span aria-hidden className={`text-2xl text-bone/50 transition-transform duration-500 ${section === item.key ? "rotate-45" : ""}`}>+</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {section === item.key && (
                          <m.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.5, ease: EASE_HOUSE }}
                            className="overflow-hidden"
                          >
                            {sub.map((c) => (
                              <li key={c.slug}>
                                <Link
                                  href={section === "collections" ? `/collections/${c.slug}` : `/shop?category=${c.slug}`}
                                  className="block py-2 pl-1 text-lg text-bone/75"
                                >
                                  {c.name}
                                </Link>
                              </li>
                            ))}
                            <li className="h-4" />
                          </m.ul>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </m.li>
              ))}
            </ul>

            <div className="mt-10 grid grid-cols-2 gap-4 text-sm text-bone/70">
              <Link href="/account" className="label">{signedIn ? "Account" : "Sign in"}</Link>
              <Link href="/account?tab=Wishlist" className="label">Wishlist{wishlistCount ? ` (${wishlistCount})` : ""}</Link>
              <Link href="/journal" className="label">Journal</Link>
              <Link href="/contact" className="label">Contact</Link>
            </div>
          </nav>
        </m.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}

function Badge({ value, inverted }: { value: number; inverted?: boolean }) {
  return (
    <span
      className={`absolute right-0.5 top-0.5 flex h-[1.05rem] min-w-[1.05rem] items-center justify-center overflow-hidden rounded-full px-1 text-[10px] font-semibold ${
        inverted ? "bg-bone text-ink" : "bg-ink text-ivory"
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_HOUSE }}
        >
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 active:scale-95"
    >
      {children}
    </button>
  );
}

function IconLink({ href, label, className = "", children }: { href: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`relative h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 active:scale-95 ${className || "flex"}`}
    >
      {children}
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <circle cx="9" cy="9" r="6.25" />
      <path d="M17 17l-3.8-3.8" strokeLinecap="round" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M10 17s-6.2-4-8.3-7.7C.4 6.9 1.7 4 4.5 3.5c1.9-.4 3.7.5 5 2.2 1.3-1.7 3.1-2.6 5-2.2 2.8.5 4.1 3.4 2.8 5.8C16.2 13 10 17 10 17Z" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <circle cx="10" cy="6.5" r="3.25" />
      <path d="M3.5 17c1.2-3.4 4-5 6.5-5s5.3 1.6 6.5 5" strokeLinecap="round" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M5 7.5h10l.8 10a1.5 1.5 0 0 1-1.5 1.5H5.7A1.5 1.5 0 0 1 4.2 17.5L5 7.5Z" strokeLinejoin="round" />
      <path d="M7.2 7.5V6a2.8 2.8 0 0 1 5.6 0v1.5" strokeLinecap="round" />
    </svg>
  );
}
