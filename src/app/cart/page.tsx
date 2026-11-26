"use client";

import Link from "next/link";
import { useCart, MADE_TO_ORDER_MAX_QTY, isMadePerOrder, maxQuantityFor } from "@/lib/cart-context";
import { useDeliverySettings } from "@/lib/delivery";
import { formatNaira } from "@/lib/format";
import { toast } from "@/lib/toast";
import { effectivePrice, needsMeasurements, wasPrice } from "@/lib/product-utils";
import { placeholderFor } from "@/lib/brand-images";
import { itemFromProduct, track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import SmartImage from "@/components/ui/SmartImage";
import MeasurementStatus, { measureHref } from "@/components/shop/MeasurementStatus";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, count, isReady, toggleWishlist, isWishlisted } = useCart();
  const delivery = useDeliverySettings();

  if (!isReady) return <div className="mx-auto max-w-5xl px-4 py-20" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="eyebrow">Shopping Bag</p>
        <h1 className="mt-2 font-display text-3xl">Your bag is empty</h1>
        <p className="mt-3 text-sm text-ink/60">Pieces you add will appear here.</p>
        <Button href="/shop" className="mt-8">
          Continue Shopping
        </Button>
      </div>
    );
  }

  // Delivery is priced per zone at checkout; only the free-delivery threshold
  // is certain here.
  const threshold = delivery.freeDeliveryThreshold;
  const freeDelivery = threshold !== undefined && subtotal >= threshold;
  const toFree = threshold !== undefined ? Math.max(0, threshold - subtotal) : 0;
  const missing = items.filter(needsMeasurements);
  const blocked = missing.length > 0;

  function saveForLater(item: CartItem) {
    if (!isWishlisted(item.product.id)) toggleWishlist(item.product.id);
    removeItem(item.id);
    toast("Saved for later", { description: `${item.product.name} is in your wishlist.` });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Shopping Bag</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl">
        Your Bag <span className="text-ink/45">({count} {count === 1 ? "piece" : "pieces"})</span>
      </h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => {
            const unit = effectivePrice(item.product) + (item.customizationCost ?? 0);
            const was = wasPrice(item.product);
            const max = item.customOrder ? MADE_TO_ORDER_MAX_QTY : maxQuantityFor(item.product, item.size);
            const atCap = item.quantity >= max;
            const capNote = !atCap ? null : item.customOrder || isMadePerOrder(item.product) ? `Up to ${max} per order` : `Only ${max} available`;
            return (
              <li key={item.id} className="flex gap-4 py-6 sm:gap-6">
                <Link href={`/product/${item.product.slug}`} className="relative h-32 w-24 shrink-0 overflow-hidden bg-ivory-deep sm:h-40 sm:w-28">
                  <SmartImage
                    src={item.product.images?.[0]}
                    alt={item.product.name}
                    fill
                    sizes="112px"
                    placeholder={placeholderFor(item.product.images?.[0])}
                    className="object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link href={`/product/${item.product.slug}`} className="font-display text-lg hover:text-brass">
                          {item.product.name}
                        </Link>
                        <p className="mt-1 text-xs text-ink/60">
                          Size {item.size}
                          {item.color && ` · ${item.color}`}
                        </p>
                      </div>
                      <p className="text-right text-sm text-ink/80">
                        {formatNaira(unit * item.quantity)}
                        {was !== undefined && (
                          <span className="block text-xs text-ink/40 line-through">
                            <span className="sr-only">Was </span>
                            {formatNaira((was + (item.customizationCost ?? 0)) * item.quantity)}
                          </span>
                        )}
                      </p>
                    </div>

                    {item.customOrder && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/50">
                        <span className="eyebrow text-brass">Custom Order</span>
                        {item.customOrder.fabricId && <span>Fabric selected</span>}
                        {item.customOrder.referenceImages && item.customOrder.referenceImages.length > 0 && (
                          <span>{item.customOrder.referenceImages.length} reference image(s)</span>
                        )}
                        {item.customOrder.specialInstructions && <span>Special instructions added</span>}
                      </div>
                    )}

                    <MeasurementStatus item={item} back="/cart" className="mt-2" />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center border border-line" role="group" aria-label={`Quantity of ${item.product.name}`}>
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.product.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1.5 text-ink/70 hover:text-ink disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.product.name}`}
                        disabled={atCap}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1.5 text-ink/70 hover:text-ink disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <button type="button" onClick={() => saveForLater(item)} className="eyebrow text-ink/50 hover:text-ink">
                        Save for later
                      </button>
                      <button type="button" onClick={() => removeItem(item.id)} className="eyebrow text-ink/50 hover:text-error">
                        Remove
                      </button>
                    </div>
                  </div>
                  {capNote && (
                    <p className="mt-1.5 text-[11px] text-terracotta" role="status">
                      {capNote}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <aside aria-labelledby="summary-heading" className="h-fit border border-line p-6 lg:sticky lg:top-24">
          <h2 id="summary-heading" className="eyebrow mb-4">
            Order Summary
          </h2>
          <dl className="space-y-2.5 text-sm">
            <Row label={`Subtotal (${count} ${count === 1 ? "piece" : "pieces"})`} value={formatNaira(subtotal)} />
            <Row label="Delivery" value={freeDelivery ? "Free" : "Calculated at checkout"} muted={!freeDelivery} />
          </dl>
          {threshold !== undefined && !freeDelivery && toFree > 0 && (
            <p className="mt-3 text-xs text-ink/55">
              Add {formatNaira(toFree)} more for free delivery.
            </p>
          )}
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <p className="font-medium">Total</p>
            <p className="font-display text-xl">{formatNaira(subtotal)}</p>
          </div>
          {!freeDelivery && <p className="mt-1 text-right text-xs text-ink/50">plus delivery, calculated at checkout</p>}

          {blocked && (
            <div id="checkout-blocked" role="status" className="mt-5 border border-error/40 bg-bone p-4 text-xs leading-relaxed text-ink/80">
              <p className="font-medium text-error">
                {missing.length === 1 ? "One piece needs" : `${missing.length} pieces need`} your measurements before checkout.
              </p>
              <ul className="mt-2 space-y-1.5">
                {missing.map((item) => (
                  <li key={item.id}>
                    <Link href={measureHref(item, "/cart")} className="underline underline-offset-2 hover:text-ink">
                      Add measurements for {item.product.name} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blocked ? (
            <Button type="button" disabled aria-describedby="checkout-blocked" size="lg" className="mt-5 w-full">
              Checkout
            </Button>
          ) : (
            <Button
              href="/checkout"
              size="lg"
              className="mt-5 w-full"
              onClick={() => track("begin_checkout", { value: subtotal, items: items.map((i) => itemFromProduct(i.product, i)) })}
            >
              Checkout
            </Button>
          )}
          <Button href="/shop" variant="secondary" className="mt-3 w-full">
            Continue shopping
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/60">{label}</dt>
      <dd className={muted ? "text-ink/45" : "text-ink/80"}>{value}</dd>
    </div>
  );
}
