"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Product, MeasurementUnit, MeasurementValues } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAdminStore } from "@/lib/admin/store";
import { Button } from "@/components/ui/Button";
import MeasurementCapture from "@/components/measurement/MeasurementCapture";
import ProductCard from "@/components/product/ProductCard";

const TABS = ["Description", "Fabric", "Size Guide", "Shipping", "Care"] as const;

export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, setItemMeasurement, toggleWishlist, isWishlisted } = useCart();
  const { products, categories } = useAdminStore();
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(product.sizes[Math.floor(product.sizes.length / 2)]);
  const [color, setColor] = useState(product.colors[0].name);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Description");
  const [measurementDone, setMeasurementDone] = useState(false);
  const [pendingMeasurement, setPendingMeasurement] = useState<{
    mode: "profile" | "manual";
    profileId?: string;
    values?: MeasurementValues;
    unit: MeasurementUnit;
  } | null>(null);

  const isMTM = product.productionType === "made-to-measure";
  const wished = isWishlisted(product.id);

  const crossSell = (product.crossSellCategorySlugs ?? [])
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .flatMap((c) => products.filter((p) => p.category === c.name && p.id !== product.id && p.publishStatus === "published"))
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 4);

  function handleAdd(buyNow: boolean) {
    const id = addItem(product, size, color, quantity);
    if (isMTM && pendingMeasurement) {
      setItemMeasurement(id, { ...pendingMeasurement, mode: pendingMeasurement.mode });
    }
    if (buyNow) router.push("/checkout");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div>
          <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
            <Image src={product.images[activeImage]} alt={product.name} fill priority className="object-cover" />
          </div>
          <div className="mt-3 flex gap-3">
            {product.images.map((img, i) => (
              <button
                key={img}
                onClick={() => setActiveImage(i)}
                className={`relative h-20 w-16 overflow-hidden border ${activeImage === i ? "border-brass" : "border-line"}`}
              >
                <Image src={img} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <p className="eyebrow">{product.category}{product.gender === "unisex" && " · Unisex"}</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <p className="text-lg text-ink/80">From {formatNaira(product.price)}</p>
            {product.compareAtPrice && (
              <p className="text-sm text-ink/40 line-through">{formatNaira(product.compareAtPrice)}</p>
            )}
          </div>
          {isMTM && <p className="mt-2 eyebrow text-clay">Made-to-Measure Piece</p>}

          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink/70">{product.description}</p>

          {product.customizable ? (
            <>
              {/* Fully customizable pieces route into the advanced wizard —
                  fabric, colour, size/measurements, and preferences are all
                  captured there rather than duplicated on this page. */}
              <div className="mt-7 border border-line bg-ivory-deep/30 p-5">
                <p className="eyebrow mb-2 text-brass">Design Yours</p>
                <p className="text-sm text-ink/70">
                  Choose your fabric, colour, fit, and any special details — this piece is cut to your exact
                  specification in our Lagos atelier.
                </p>
                <ul className="mt-3 space-y-1 text-xs text-ink/50">
                  <li>Fabric &amp; colour of your choice</li>
                  <li>Standard size or your own measurements</li>
                  <li>Reference images &amp; special instructions welcome</li>
                </ul>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button href={`/customize/${product.slug}`} size="lg" className="flex-1">
                  Customize This Design
                </Button>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  aria-pressed={wished}
                  className={`flex items-center justify-center border px-4 py-3 text-sm ${
                    wished ? "border-brass text-brass" : "border-line text-ink/60 hover:border-ink"
                  }`}
                >
                  {wished ? "♥ Wishlisted" : "♡ Wishlist"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Colour */}
              <div className="mt-6">
                <p className="eyebrow mb-2">Colour — {color}</p>
                <div className="flex gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      aria-pressed={color === c.name}
                      className={`h-8 w-8 rounded-full border-2 ${color === c.name ? "border-brass" : "border-transparent"}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mt-5">
                <p className="eyebrow mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`border px-3.5 py-2 text-sm ${
                        size === s ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="mt-5">
                <p className="eyebrow mb-2">Quantity</p>
                <div className="flex w-fit items-center border border-line">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2 text-ink/70 hover:text-ink">
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{quantity}</span>
                  <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-2 text-ink/70 hover:text-ink">
                    +
                  </button>
                </div>
              </div>

              {/* Measurement capture */}
              {isMTM && (
                <div className="mt-7">
                  <MeasurementCapture
                    garment={product.garment}
                    storageKey={`measure-draft-${product.slug}`}
                    fieldOverride={product.measurementFieldKeys}
                    onSaved={(payload) => {
                      setPendingMeasurement(payload);
                      setMeasurementDone(true);
                    }}
                  />
                  {!measurementDone && (
                    <p className="mt-2 text-xs text-clay">
                      You can also add measurements after checkout begins — your progress is saved automatically.
                    </p>
                  )}
                </div>
              )}

              {/* CTAs */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => handleAdd(false)} className="flex-1">
                  Add to Bag
                </Button>
                <Button onClick={() => handleAdd(true)} variant="secondary" className="flex-1">
                  Buy Now
                </Button>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  aria-pressed={wished}
                  className={`flex items-center justify-center border px-4 py-3 text-sm ${
                    wished ? "border-brass text-brass" : "border-line text-ink/60 hover:border-ink"
                  }`}
                >
                  {wished ? "♥ Wishlisted" : "♡ Wishlist"}
                </button>
              </div>
            </>
          )}

          <p className="mt-4 text-xs text-ink/50">
            {product.stock === "in-stock" && "In stock — ships in 2–4 business days."}
            {product.stock === "low-stock" && "Low stock — a few pieces remaining."}
            {product.stock === "made-to-order" && `Made to order — ${product.productionDays.standard[0]}–${product.productionDays.standard[1]} business days.`}
          </p>

          {/* Tabs */}
          <div className="mt-10 border-t border-line pt-6">
            <div className="flex gap-6">
              {TABS.filter((t) => t !== "Size Guide" || product.sizeChart).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`eyebrow pb-2 ${tab === t ? "border-b-2 border-brass text-ink" : "text-ink/40 hover:text-ink"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm leading-relaxed text-ink/70">
              {tab === "Description" && (
                <ul className="list-disc space-y-1 pl-4">
                  {product.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              {tab === "Fabric" && <p>{product.fabric}</p>}
              {tab === "Size Guide" && product.sizeChart && (
                <div className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: product.sizeChart }} />
              )}
              {tab === "Shipping" && (
                <div className="space-y-1">
                  <p>Standard production: {product.productionDays.standard[0]}–{product.productionDays.standard[1]} business days.</p>
                  <p>Express production: {product.productionDays.express[0]}–{product.productionDays.express[1]} business days, for an additional fee at checkout.</p>
                </div>
              )}
              {tab === "Care" && (
                <ul className="list-disc space-y-1 pl-4">
                  {product.careInstructions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {crossSell.length > 0 && (
        <div className="mt-20 border-t border-line pt-14">
          <p className="eyebrow mb-1">Complete the Look</p>
          <h2 className="mb-8 font-display text-2xl">Pair It With</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {crossSell.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
