"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useAdminStore } from "@/lib/admin/store";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import MeasurementStatus from "@/components/shop/MeasurementStatus";


export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, isReady } = useCart();
  const { productionSettings } = useAdminStore();

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

  const deliveryFee = productionSettings.standardFee;
  const total = subtotal + deliveryFee;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Shopping Bag</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl">Your Bag ({items.length})</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 py-6 sm:gap-6">
              <div className="relative h-32 w-24 shrink-0 overflow-hidden bg-ivory-deep sm:h-40 sm:w-28">
                <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/product/${item.product.slug}`} className="font-display text-lg hover:text-brass">
                        {item.product.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink/60">
                        Size {item.size} · {item.color}
                      </p>
                    </div>
                    <p className="text-sm text-ink/80">{formatNaira((item.product.price + (item.customizationCost ?? 0)) * item.quantity)}</p>
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
                  <div className="flex items-center border border-line">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-1.5 text-ink/70 hover:text-ink"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1.5 text-ink/70 hover:text-ink"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <button className="eyebrow text-ink/50 hover:text-ink">Save for Later</button>
                    <button onClick={() => removeItem(item.id)} className="eyebrow text-ink/50 hover:text-error">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit border border-line p-6">
          <p className="eyebrow mb-4">Order Summary</p>
          <div className="space-y-2.5 text-sm">
            <Row label="Subtotal" value={formatNaira(subtotal)} />
            <Row label="Delivery Fee" value={formatNaira(deliveryFee)} />
            <Row label="Express Production Fee" value="Calculated at checkout" muted />
            <Row label="Discount" value="—" muted />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <p className="font-medium">Total</p>
            <p className="font-display text-xl">{formatNaira(total)}</p>
          </div>
          <Button href="/checkout" className="mt-6 w-full">
            Proceed to Checkout
          </Button>
          <Link href="/shop" className="mt-3 block text-center text-xs text-ink/50 hover:text-ink">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={muted ? "text-ink/40" : "text-ink/80"}>{value}</span>
    </div>
  );
}
