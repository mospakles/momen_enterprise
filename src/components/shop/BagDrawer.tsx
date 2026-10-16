"use client";

// The slide-out bag. Opens on every add-to-bag (no redirect), edits lines in
// place, lets a removal be undone, and carries promo/gift choices through to
// checkout. Totals are previews: checkout and the API remain the source of
// truth for prices, delivery and discounts.

import { Portal } from "@/components/ui/Portal";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useCart, CART_ADDED_EVENT } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import { useDeliverySettings } from "@/lib/delivery";
import { useCheckoutPrefs } from "@/lib/checkout-prefs";
import { apiRequest } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { itemFromProduct, track } from "@/lib/analytics";
import { trapFocus, useDialog } from "@/lib/a11y";
import { useScrollLock } from "@/lib/motion/hooks";
import { EASE_HOUSE } from "@/lib/motion/ease";
import type { CartItem } from "@/lib/types";
import { MEDIA } from "@/components/journey/media";
import { placeholderFor } from "@/lib/brand-images";

const needsMeasurements = (item: CartItem) =>
  item.product.productionType === "made-to-measure" &&
  !(item.customOrder && item.size !== "Made-to-Measure") &&
  (!item.measurement || item.measurement.mode === "pending");

export default function BagDrawer() {
  const { bagOpen, openBag, closeBag } = useUI();
  const cart = useCart();
  const { items, subtotal, count } = cart;
  const pathname = usePathname();
  const router = useRouter();
  const delivery = useDeliverySettings();
  const { prefs, update } = useCheckoutPrefs();
  const panel = useDialog<HTMLDivElement>(bagOpen, closeBag);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ item: CartItem; index: number } | null>(null);
  useScrollLock(bagOpen);

  // Open on add-to-bag, highlight the new line, record the event.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  useEffect(() => {
    const onAdded = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      setJustAdded(id);
      const line = itemsRef.current.find((i) => i.id === id);
      if (line) track("add_to_cart", { items: [itemFromProduct(line.product, line)], value: line.product.price * line.quantity });
      if (!window.location.pathname.startsWith("/checkout")) openBag();
    };
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(CART_ADDED_EVENT, onAdded);
  }, [openBag]);

  useEffect(() => {
    if (!justAdded) return;
    const id = window.setTimeout(() => setJustAdded(null), 2400);
    return () => window.clearTimeout(id);
  }, [justAdded]);

  useEffect(() => {
    if (!removed) return;
    const id = window.setTimeout(() => setRemoved(null), 7000);
    return () => window.clearTimeout(id);
  }, [removed]);

  useEffect(() => {
    closeBag();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close on route change only
  }, [pathname]);

  const threshold = delivery.freeDeliveryThreshold;
  const freeDelivery = threshold !== undefined && subtotal >= threshold;
  const toFree = threshold !== undefined ? Math.max(0, threshold - subtotal) : 0;
  const progress = threshold ? Math.min(1, subtotal / threshold) : 0;
  const deliveryFee = freeDelivery ? 0 : delivery.standardFee;

  function remove(item: CartItem) {
    const index = items.findIndex((i) => i.id === item.id);
    cart.removeItem(item.id);
    setRemoved({ item, index });
    track("remove_from_cart", { items: [itemFromProduct(item.product, item)] });
  }

  function checkout() {
    track("begin_checkout", { value: subtotal, items: items.map((i) => itemFromProduct(i.product, i)) });
    router.push("/checkout");
  }

  return (
    <Portal>
    <AnimatePresence>
      {bagOpen && (
        <div className="fixed inset-0 z-[120]">
          <m.div
            aria-hidden
            className="absolute inset-0 bg-night/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBag}
          />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bag-title"
            onKeyDown={trapFocus}
            data-lenis-prevent
            className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-ivory shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.65, ease: EASE_HOUSE }}
          >
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 id="bag-title" className="display text-2xl">
                Your bag <span className="text-ink/40">({count})</span>
              </h2>
              <button type="button" onClick={closeBag} className="label px-2 py-2 text-ink/60 hover:text-ink" aria-label="Close bag">
                Close
              </button>
            </header>

            {items.length === 0 && !removed ? (
              <EmptyBag onClose={closeBag} />
            ) : (
              <>
                {threshold !== undefined && (
                  <div className="border-b border-line px-6 py-4">
                    <p className="text-sm text-ink/75" aria-live="polite">
                      {freeDelivery ? (
                        <>Complimentary delivery is yours.</>
                      ) : (
                        <>
                          You&rsquo;re <span className="font-semibold text-ink">{formatNaira(toFree)}</span> away from free delivery.
                        </>
                      )}
                    </p>
                    <div className="mt-3 h-[3px] w-full overflow-hidden bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress to free delivery">
                      <m.div className="h-full bg-terracotta" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8, ease: EASE_HOUSE }} />
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto overscroll-contain px-6">
                  <AnimatePresence initial={false}>
                    {removed && (
                      <m.div
                        key="undo"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 flex items-center justify-between bg-bone px-4 py-3 text-sm" role="status">
                          <span className="truncate pr-3 text-ink/75">Removed {removed.item.product.name}</span>
                          <button
                            type="button"
                            className="label shrink-0 text-ink underline underline-offset-4"
                            onClick={() => {
                              cart.restoreItem(removed.item, removed.index);
                              setRemoved(null);
                            }}
                          >
                            Undo
                          </button>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                  <ul>
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <BagLine key={item.id} item={item} highlight={item.id === justAdded} onRemove={() => remove(item)} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>

                {items.length > 0 && (
                  <footer className="border-t border-line bg-ivory px-6 pb-6 pt-4">
                    <Extras subtotal={subtotal} items={items} prefs={prefs} update={update} />
                    <dl className="mt-4 space-y-1.5 text-sm">
                      <SummaryRow label="Subtotal" value={formatNaira(subtotal)} />
                      <SummaryRow
                        label="Delivery"
                        value={freeDelivery ? "Free" : deliveryFee ? `From ${formatNaira(deliveryFee)}` : "Calculated at checkout"}
                        muted={!freeDelivery}
                      />
                    </dl>
                    <button
                      type="button"
                      onClick={checkout}
                      className="mt-5 flex w-full items-center justify-between bg-ink px-6 py-4 text-sm tracking-wide text-ivory transition-colors duration-500 hover:bg-terracotta active:scale-[0.99]"
                    >
                      <span>Checkout</span>
                      <span>{formatNaira(subtotal + (deliveryFee || 0))}</span>
                    </button>
                    <div className="mt-3 flex items-center justify-between text-xs text-ink/55">
                      <span className="flex items-center gap-1.5">
                        <LockIcon /> Secure payment via Paystack
                      </span>
                      <Link href="/cart" className="link-line">
                        View full bag
                      </Link>
                    </div>
                  </footer>
                )}
              </>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>
    </Portal>
  );
}

function BagLine({ item, highlight, onRemove }: { item: CartItem; highlight: boolean; onRemove: () => void }) {
  const { updateQuantity, updateItem, toggleWishlist, isWishlisted } = useCart();
  const { product } = item;
  const unit = product.price + (item.customizationCost ?? 0);
  const editable = !item.customOrder;
  const mtmWarning = needsMeasurements(item);

  return (
    <m.li
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.5, ease: EASE_HOUSE }}
      className={`flex gap-4 overflow-hidden border-b border-line py-5 transition-colors duration-1000 ${highlight ? "bg-bone/70" : ""}`}
    >
      <Link href={`/product/${product.slug}`} className="relative h-32 w-24 shrink-0 overflow-hidden bg-bone">
        <Image src={product.images[0]} alt={product.name} fill sizes="96px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/product/${product.slug}`} className="display text-lg leading-tight hover:text-terracotta">
            {product.name}
          </Link>
          <p className="shrink-0 text-sm">{formatNaira(unit * item.quantity)}</p>
        </div>

        {editable ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink/70">
            {product.sizes.length > 1 ? (
              <label className="flex items-center gap-1.5">
                <span className="text-ink/50">Size</span>
                <select
                  value={item.size}
                  onChange={(e) => updateItem(item.id, { size: e.target.value })}
                  className="border-b border-line bg-transparent py-0.5 pr-1 text-ink outline-none focus:border-ink"
                >
                  {product.sizes.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            ) : (
              <span>{item.size}</span>
            )}
            {product.colors.length > 1 ? (
              <span className="flex items-center gap-1.5" role="radiogroup" aria-label="Colour">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    role="radio"
                    aria-checked={item.color === c.name}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => updateItem(item.id, { color: c.name })}
                    className={`h-4 w-4 rounded-full border transition-shadow ${item.color === c.name ? "border-ink shadow-[0_0_0_2px_var(--color-ivory),0_0_0_3px_var(--color-ink)]" : "border-ink/15"}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </span>
            ) : (
              <span>{item.color}</span>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink/60">
            <span className="label mr-2 text-terracotta">Custom order</span>
            {item.size} · {item.color}
          </p>
        )}

        {mtmWarning && (
          <Link href={item.customOrder ? `/customize/${product.slug}` : `/product/${product.slug}`} className="mt-2 text-xs text-error underline underline-offset-2">
            Measurements needed — add them now
          </Link>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center border border-line">
            <button
              type="button"
              aria-label={`Decrease quantity of ${product.name}`}
              disabled={item.quantity <= 1}
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="h-8 w-8 text-ink/70 hover:text-ink disabled:opacity-30"
            >
              −
            </button>
            <span className="w-7 text-center text-sm tabular-nums" aria-live="polite" aria-label={`Quantity ${item.quantity}`}>
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Increase quantity of ${product.name}`}
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="h-8 w-8 text-ink/70 hover:text-ink"
            >
              +
            </button>
          </div>
          <div className="flex gap-4 text-xs">
            <button
              type="button"
              className="link-line text-ink/60 hover:text-ink"
              onClick={() => {
                if (!isWishlisted(product.id)) toggleWishlist(product.id);
                onRemove();
              }}
            >
              Save for later
            </button>
            <button type="button" onClick={onRemove} className="link-line text-ink/60 hover:text-error">
              Remove
            </button>
          </div>
        </div>
      </div>
    </m.li>
  );
}

function Extras({
  subtotal,
  items,
  prefs,
  update,
}: {
  subtotal: number;
  items: CartItem[];
  prefs: ReturnType<typeof useCheckoutPrefs>["prefs"];
  update: ReturnType<typeof useCheckoutPrefs>["update"];
}) {
  const [open, setOpen] = useState<"promo" | "gift" | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ state: "idle" | "checking" | "error" | "ok"; message?: string; discount?: number }>({ state: "idle" });

  async function apply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setStatus({ state: "checking" });
    try {
      const result = await apiRequest<{ code: string; discountAmount: number }>("/coupons/validate", {
        method: "POST",
        body: { code: trimmed, subtotal, items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })) },
      });
      update({ couponCode: result.code });
      setStatus({ state: "ok", discount: result.discountAmount });
      setCode("");
    } catch (error) {
      setStatus({ state: "error", message: error instanceof Error ? error.message : "That code couldn't be applied." });
    }
  }

  return (
    <div className="text-sm">
      <div className="flex gap-5">
        <button type="button" aria-expanded={open === "promo"} onClick={() => setOpen((o) => (o === "promo" ? null : "promo"))} className="label link-line text-ink/70">
          {prefs.couponCode ? `Code: ${prefs.couponCode}` : "Promo code"}
        </button>
        <button type="button" aria-expanded={open === "gift"} onClick={() => setOpen((o) => (o === "gift" ? null : "gift"))} className="label link-line text-ink/70">
          {prefs.giftWrap || prefs.giftMessage ? "Gift ✓" : "This is a gift"}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open === "promo" && (
          <m.div key="promo" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">
              {prefs.couponCode ? (
                <p className="flex items-center justify-between text-ink/75">
                  <span>
                    <span className="font-semibold text-ink">{prefs.couponCode}</span>
                    {status.state === "ok" && status.discount ? ` — saves ${formatNaira(status.discount)}` : " — applied at checkout"}
                  </span>
                  <button type="button" className="text-xs text-ink/50 underline" onClick={() => { update({ couponCode: undefined }); setStatus({ state: "idle" }); }}>
                    Remove
                  </button>
                </p>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void apply();
                  }}
                >
                  <label htmlFor="bag-promo" className="sr-only">Promo code</label>
                  <input
                    id="bag-promo"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoCapitalize="characters"
                    autoComplete="off"
                    placeholder="Enter code"
                    aria-invalid={status.state === "error"}
                    aria-describedby={status.state === "error" ? "bag-promo-error" : undefined}
                    className="min-w-0 flex-1 border-b border-line bg-transparent py-2 uppercase outline-none placeholder:normal-case focus:border-ink"
                  />
                  <button type="submit" disabled={status.state === "checking" || !code.trim()} className="label px-2 text-ink disabled:opacity-40">
                    {status.state === "checking" ? "Checking…" : "Apply"}
                  </button>
                </form>
              )}
              {status.state === "error" && (
                <p id="bag-promo-error" role="alert" className="mt-1.5 text-xs text-error">
                  {status.message}
                </p>
              )}
            </div>
          </m.div>
        )}
        {open === "gift" && (
          <m.div key="gift" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 pt-3">
              <label className="flex items-center gap-2.5 text-ink/80">
                <input type="checkbox" checked={Boolean(prefs.giftWrap)} onChange={(e) => update({ giftWrap: e.target.checked })} className="h-4 w-4 accent-ink" />
                Gift wrap in momen. tissue — complimentary
              </label>
              <label className="block">
                <span className="sr-only">Gift message</span>
                <textarea
                  value={prefs.giftMessage ?? ""}
                  maxLength={300}
                  rows={2}
                  onChange={(e) => update({ giftMessage: e.target.value })}
                  placeholder="Add a handwritten note (optional)"
                  className="w-full resize-none border border-line bg-transparent p-2.5 outline-none focus:border-ink"
                />
                <span className="block text-right text-[11px] text-ink/40">{(prefs.giftMessage ?? "").length}/300</span>
              </label>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyBag({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative mx-6 mt-6 aspect-[4/3] overflow-hidden bg-bone">
        <Image
          src={MEDIA.emptyBag.src}
          alt=""
          placeholder={placeholderFor(MEDIA.emptyBag.src)}
          fill
          sizes="420px"
          className="object-cover object-[50%_25%]"
        />
      </div>
      <div className="px-6 py-8">
        <p className="display text-3xl">Your bag is waiting.</p>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">Nothing here yet. Start with a look, or the pieces made for your next occasion.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/shop" onClick={onClose} className="bg-ink px-6 py-4 text-center text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta">
            Enter the collection
          </Link>
          <Link href="/account?tab=Wishlist" onClick={onClose} className="border border-line px-6 py-4 text-center text-sm tracking-wide hover:border-ink">
            View your wishlist
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink/60">{label}</dt>
      <dd className={muted ? "text-ink/55" : "text-ink"}>{value}</dd>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <rect x="2" y="5.5" width="8" height="5.5" rx="0.5" />
      <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
    </svg>
  );
}
