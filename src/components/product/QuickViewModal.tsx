"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/Button";
import { isMadeToMeasure } from "@/lib/product-utils";

export default function QuickViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0].name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div
        className="fade-up grid w-full max-w-3xl grid-cols-1 gap-6 bg-ivory p-5 sm:grid-cols-2 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
        </div>
        <div className="flex flex-col">
          <button onClick={onClose} aria-label="Close" className="self-end text-ink/50 hover:text-ink">
            ✕
          </button>
          <p className="eyebrow">{product.category}</p>
          <h2 className="mt-1 font-display text-2xl">{product.name}</h2>
          <p className="mt-2 text-ink/80">{formatNaira(product.price)}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.description}</p>

          {product.customizable ? (
            <>
              <p className="mt-5 text-xs text-ink/50">
                Choose your fabric, colour, and fit for this piece in the Made-to-Measure wizard.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button href={`/customize/${product.slug}`} onClick={onClose}>Customize This Design</Button>
                <Button href={`/product/${product.slug}`} variant="secondary" onClick={onClose}>
                  View Full Details
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-5">
                <p className="eyebrow mb-2">Colour — {color}</p>
                <div className="flex gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      aria-label={c.name}
                      aria-pressed={color === c.name}
                      className={`h-7 w-7 rounded-full border-2 ${color === c.name ? "border-brass" : "border-transparent"}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="eyebrow mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`border px-3 py-1.5 text-xs ${
                        size === s ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <Button onClick={() => { addItem(product, size, color); onClose(); }}>Add to Bag</Button>
                <Button href={`/product/${product.slug}`} variant="secondary">
                  View Full Details
                </Button>
              </div>
              {isMadeToMeasure(product) && (
                <p className="mt-3 text-xs text-clay">
                  Added in a standard size from our size guide. To have it cut to your measurements, choose &ldquo;Made to measure&rdquo; on the{" "}
                  <Link href={`/product/${product.slug}`} className="underline">
                    product page
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
