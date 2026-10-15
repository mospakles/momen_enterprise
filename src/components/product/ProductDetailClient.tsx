"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Product, MeasurementUnit, MeasurementValues } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAdminStore } from "@/lib/admin/store";
import { useUI } from "@/lib/ui-context";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";
import { itemFromProduct, track } from "@/lib/analytics";
import { estimateArrival, formatArrival, useDeliverySettings } from "@/lib/delivery";
import { availableUnits, inCategory, isAccessory, isMadeToMeasure, isOneSize, stockState } from "@/lib/product-utils";
import { useRecentlyViewed } from "@/lib/recently-viewed";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { AccordionItem } from "@/components/ui/Accordion";
import MeasurementCapture from "@/components/measurement/MeasurementCapture";
import { Gallery, type Media } from "./pdp/Gallery";
import SizeGuide from "./pdp/SizeGuide";
import Reviews from "./pdp/Reviews";
import ProductRail from "./pdp/ProductRail";
import SpinViewer from "./pdp/SpinViewer";
import { Modal } from "@/components/ui/Modal";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City"];
const CITY_KEY = "momen.delivery-city";

type PendingMeasurement = { mode: "profile" | "manual"; profileId?: string; values?: MeasurementValues; unit: MeasurementUnit };

export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, setItemMeasurement, toggleWishlist, isWishlisted } = useCart();
  const { products, categories } = useAdminStore();
  const { flyToBag } = useUI();
  const delivery = useDeliverySettings();
  const recentSlugs = useRecentlyViewed(product.slug);

  const oneSize = isOneSize(product);
  const isMTM = isMadeToMeasure(product);
  const stock = stockState(product);
  const soldOut = stock === "sold-out";
  const wished = isWishlisted(product.id);

  const [size, setSize] = useState<string | null>(oneSize ? product.sizes[0] ?? "One Size" : null);
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [quantity, setQuantity] = useState(1);
  const [fitMode, setFitMode] = useState<"standard" | "measure">("standard");
  const [pendingMeasurement, setPendingMeasurement] = useState<PendingMeasurement | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [city, setCity] = useState("Lagos");
  const [ctaVisible, setCtaVisible] = useState(true);

  const galleryRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    track("view_item", { value: product.price, items: [itemFromProduct(product)] });
    try {
      const saved = localStorage.getItem(CITY_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the visitor's saved delivery city
      if (saved) setCity(saved);
    } catch {
      // ignore
    }
  }, [product]);

  // Mobile sticky bar shows once the main CTA has scrolled out above.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting || entry.boundingClientRect.top > 0), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Selecting a colour swaps the gallery to that colour's photos, if any.
  const colorImages = product.colors.find((c) => c.name === color)?.images;
  const galleryImages = colorImages && colorImages.length > 0 ? colorImages : product.images;
  const media: Media[] = useMemo(
    () => [...galleryImages.map((src) => ({ type: "image" as const, src })), ...(product.videos ?? []).map((src) => ({ type: "video" as const, src }))],
    [galleryImages, product.videos],
  );
  const [spinOpen, setSpinOpen] = useState(false);
  const hasSpin = (product.spinImages?.length ?? 0) >= 8;

  // Per-size availability (only for sizes tracked individually).
  const sizeLeft = (s: string) => product.sizeStock?.[s];
  const sizeSoldOut = (s: string) => soldOut || sizeLeft(s) === 0;
  const selectedSizeSoldOut = size !== null && sizeSoldOut(size);

  const category = categories.find((c) => inCategory(product, c));
  const published = useMemo(() => products.filter((p) => p.publishStatus === "published" && p.id !== product.id), [products, product.id]);

  // Complete the look: admin-chosen accessory categories, else accessories
  // that share a collection with this piece.
  const completeTheLook = useMemo(() => {
    const chosen = (product.crossSellCategorySlugs ?? [])
      .map((slug) => categories.find((c) => c.slug === slug))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .flatMap((c) => published.filter((p) => inCategory(p, c)));
    const fallback = published.filter((p) => isAccessory(p) && p.collectionSlugs.some((c) => product.collectionSlugs.includes(c)));
    const list = chosen.length ? chosen : isAccessory(product) ? [] : fallback;
    return list.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i).slice(0, 3);
  }, [product, categories, published]);

  const alsoLike = useMemo(
    () =>
      published
        .filter((p) => p.category === product.category || p.collectionSlugs.some((c) => product.collectionSlugs.includes(c)))
        .filter((p) => !completeTheLook.some((c) => c.id === p.id))
        .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category) || Number(b.isFeatured) - Number(a.isFeatured))
        .slice(0, 8),
    [published, product, completeTheLook],
  );
  const recent = useMemo(() => recentSlugs.map((s) => published.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p)).slice(0, 8), [recentSlugs, published]);

  // Delivery estimate: made-to-order work adds production time.
  const producedToOrder = isMTM || product.customizable || stock === "made-to-order";
  const arrival = estimateArrival(producedToOrder ? product.productionDays.standard : [0, 0], delivery.standardDays);

  function requireSize() {
    if (size) return true;
    setSizeError(true);
    sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  function handleAdd(buyNow: boolean, origin?: HTMLElement | null) {
    if (!requireSize()) return;
    if (selectedSizeSoldOut) {
      sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const id = addItem(product, size!, color, quantity);
    if (isMTM && fitMode === "measure" && pendingMeasurement) {
      setItemMeasurement(id, pendingMeasurement);
    }
    const rect = (origin ?? galleryRef.current)?.getBoundingClientRect();
    flyToBag(product.images[0], rect);
    if (buyNow) router.push("/checkout");
  }

  const price = (
    <div className="flex items-baseline gap-3">
      <p className="text-lg">{formatNaira(product.price)}</p>
      {product.compareAtPrice && product.compareAtPrice > product.price && (
        <p className="text-sm text-ink/40 line-through">{formatNaira(product.compareAtPrice)}</p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <nav aria-label="Breadcrumb" className="mb-6 hidden text-xs text-ink/50 lg:block">
        <ol className="flex gap-2">
          <li><Link href="/shop" className="link-line hover:text-ink">Shop</Link></li>
          {category && (
            <>
              <li aria-hidden>/</li>
              <li><Link href={`/shop?category=${category.slug}`} className="link-line hover:text-ink">{category.name}</Link></li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink/80">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <Gallery
            key={galleryImages[0]}
            ref={galleryRef}
            media={media}
            name={product.name}
            badge={
              (product.isNew || soldOut) && (
                <span className="label absolute left-4 top-4 z-10 bg-ivory px-2.5 py-1.5 text-ink lg:left-4">
                  {soldOut ? "Sold out" : "New"}
                </span>
              )
            }
          />
          {hasSpin && (
            <button
              type="button"
              onClick={() => setSpinOpen(true)}
              className="label mt-4 flex items-center gap-2 border border-line px-4 py-2.5 text-ink transition-colors hover:border-ink"
            >
              <span aria-hidden className="text-base leading-none">↻</span> View in 360°
            </button>
          )}
          {hasSpin && (
            <Modal open={spinOpen} onClose={() => setSpinOpen(false)} title="360° view">
              <SpinViewer frames={product.spinImages!} name={product.name} />
            </Modal>
          )}
        </div>

        {/* Purchase panel — sticky on desktop while the gallery scrolls */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="label text-clay">
              {category?.name ?? product.category}
              {product.gender === "unisex" && " · Unisex"}
              {(isMTM || product.customizable) && " · Made to measure"}
            </p>
            <h1 className="display mt-3 text-[clamp(2.2rem,3.6vw,3.4rem)] leading-[1]">{product.name}</h1>
            <div className="mt-4">{price}</div>
            {!soldOut && <PriceDropAlert product={product} />}
            {(product.shortDescription || product.description) && (
              <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-ink/70">{product.shortDescription || product.description}</p>
            )}

            {/* Colour */}
            {product.colors.length > 0 && (
              <fieldset className="mt-8">
                <legend className="label mb-3 text-ink/60">
                  Colour — <span className="text-ink">{color}</span>
                </legend>
                <div className="flex flex-wrap gap-3" role="radiogroup">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      role="radio"
                      aria-checked={color === c.name}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setColor(c.name)}
                      className={`h-9 w-9 rounded-full border transition-shadow duration-300 ${color === c.name ? "border-ink/20 shadow-[0_0_0_3px_var(--color-ivory),0_0_0_4px_var(--color-ink)]" : "border-ink/15 hover:shadow-[0_0_0_3px_var(--color-ivory),0_0_0_4px_var(--color-stone)]"}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {product.customizable ? (
              <DesignYours product={product} wished={wished} onWish={() => toggleWishlist(product.id)} onGuide={() => setGuideOpen(true)} ctaRef={ctaRef} />
            ) : (
              <>
                {/* Fit mode for made-to-measure pieces */}
                {isMTM && (
                  <div className="mt-8 grid grid-cols-2 border border-line p-1" role="radiogroup" aria-label="How would you like it cut?">
                    {(
                      [
                        ["standard", "Standard size"],
                        ["measure", "Made to measure"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={fitMode === mode}
                        onClick={() => setFitMode(mode)}
                        className={`relative py-2.5 text-sm transition-colors ${fitMode === mode ? "text-ivory" : "text-ink/70 hover:text-ink"}`}
                      >
                        {fitMode === mode && <m.span layoutId="fit-mode" className="absolute inset-0 bg-ink" transition={{ duration: 0.45, ease: EASE_HOUSE }} />}
                        <span className="relative">{label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Size */}
                {!oneSize && (
                  <fieldset ref={sizeRef} className="mt-8" aria-describedby={sizeError ? "size-error" : undefined}>
                    <div className="mb-3 flex items-center justify-between">
                      <legend className="label text-ink/60">
                        {isMTM && fitMode === "measure" ? "Base size" : "Size"}
                        {size && <span className="text-ink"> — {size}</span>}
                      </legend>
                      <button type="button" onClick={() => setGuideOpen(true)} className="label link-line text-ink">
                        Size guide
                      </button>
                    </div>
                    <m.div
                      className="grid grid-cols-4 gap-2 sm:grid-cols-5"
                      role="radiogroup"
                      animate={sizeError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {product.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={size === s}
                          aria-label={sizeSoldOut(s) ? `${s}, sold out` : sizeLeft(s) !== undefined && sizeLeft(s)! <= 3 ? `${s}, ${sizeLeft(s)} left` : s}
                          onClick={() => {
                            setSize(s);
                            setSizeError(false);
                          }}
                          className={`relative py-3 text-sm transition-colors duration-300 ${
                            size === s ? "bg-ink text-ivory" : "border border-line hover:border-ink"
                          } ${sizeSoldOut(s) ? (size === s ? "text-ivory/60 line-through" : "text-ink/35 line-through") : ""}`}
                        >
                          {s}
                          {!sizeSoldOut(s) && sizeLeft(s) !== undefined && sizeLeft(s)! <= 3 && (
                            <span aria-hidden className="absolute right-1 top-1 h-1 w-1 rounded-full bg-terracotta" />
                          )}
                        </button>
                      ))}
                    </m.div>
                    {sizeError && (
                      <p id="size-error" role="alert" className="mt-2 text-xs text-error">
                        Choose a size to continue.
                      </p>
                    )}
                    {size && !selectedSizeSoldOut && sizeLeft(size) !== undefined && sizeLeft(size)! <= 3 && (
                      <p className="mt-2 text-xs text-terracotta">Only {sizeLeft(size)} left in {size}.</p>
                    )}
                  </fieldset>
                )}

                <StockNote product={product} />

                {isMTM && fitMode === "measure" && (
                  <div className="mt-6">
                    <MeasurementCapture
                      garment={product.garment}
                      storageKey={`measure-draft-${product.slug}`}
                      fieldOverride={product.measurementFieldKeys}
                      onSaved={(payload) => setPendingMeasurement(payload)}
                    />
                    {!pendingMeasurement && <p className="mt-2 text-xs text-clay">You can also add measurements from your bag before checkout — progress is saved.</p>}
                  </div>
                )}

                {soldOut || selectedSizeSoldOut ? (
                  <NotifyMe product={product} size={selectedSizeSoldOut ? size : null} color={color} />
                ) : (
                  <div ref={ctaRef} className="mt-8 flex gap-3">
                    <div className="flex items-center border border-line" aria-label="Quantity">
                      <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-full w-10 text-ink/70 hover:text-ink disabled:opacity-30">−</button>
                      <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={stock === "low-stock" && quantity >= availableUnits(product) && availableUnits(product) > 0}
                        onClick={() => setQuantity((q) => q + 1)}
                        className="h-full w-10 text-ink/70 hover:text-ink disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleAdd(false, e.currentTarget)}
                      className="flex-1 bg-ink px-6 py-4 text-sm tracking-wide text-ivory transition-[background-color,transform] duration-500 hover:bg-terracotta active:scale-[0.99]"
                    >
                      Add to bag
                    </button>
                    <WishButton wished={wished} onClick={() => toggleWishlist(product.id)} />
                  </div>
                )}
                {!soldOut && !selectedSizeSoldOut && (
                  <button type="button" onClick={() => handleAdd(true)} className="label link-line mt-4 text-ink/70 hover:text-ink">
                    Buy now
                  </button>
                )}
              </>
            )}

            {/* Delivery estimate */}
            {arrival && (
              <div className="mt-8 flex items-start gap-3 border-t border-line pt-6 text-sm">
                <TruckIcon />
                <p className="text-ink/75">
                  Arrives in{" "}
                  <label className="relative inline-block">
                    <span className="sr-only">Delivery city</span>
                    <select
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        try {
                          localStorage.setItem(CITY_KEY, e.target.value);
                        } catch {
                          // ignore
                        }
                      }}
                      className="cursor-pointer appearance-none border-b border-ink/40 bg-transparent pr-1 font-medium text-ink outline-none focus:border-ink"
                    >
                      {CITIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>{" "}
                  by <span className="font-medium text-ink">{formatArrival(arrival)}</span>
                  {producedToOrder && <span className="block text-xs text-ink/50">Includes time to cut and sew your piece.</span>}
                  {delivery.freeDeliveryThreshold !== undefined && (
                    <span className="block text-xs text-ink/50">Free delivery over {formatNaira(delivery.freeDeliveryThreshold)}.</span>
                  )}
                </p>
              </div>
            )}

            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-ink/65">
              <li className="flex items-center gap-2"><Dot />Secure payment via Paystack</li>
              <li className="flex items-center gap-2"><Dot />Cut &amp; sewn in Lagos</li>
              <li className="flex items-center gap-2"><Dot /><Link href="/returns-policy" className="link-line">Returns &amp; exchanges</Link></li>
              <li className="flex items-center gap-2"><Dot /><Link href="/contact" className="link-line">Ask a stylist</Link></li>
            </ul>

            <div className="mt-10 border-t border-line">
              <AccordionItem title="Details" defaultOpen>
                {product.description && <p className="mb-3">{product.description}</p>}
                {product.details.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4">
                    {product.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </AccordionItem>
              <AccordionItem title="Fabric & care">
                {product.fabric && <p className="mb-3">{product.fabric}</p>}
                {product.careInstructions.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4">
                    {product.careInstructions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
              </AccordionItem>
              {!oneSize && (
                <AccordionItem title="Fit">
                  <p>
                    {isMTM || product.customizable
                      ? "Cut to your measurements, or to a standard size from our chart."
                      : "True to size. Between sizes? Size up for a relaxed fall."}
                  </p>
                  <button type="button" onClick={() => setGuideOpen(true)} className="label link-line mt-3 text-ink">
                    Open the size guide
                  </button>
                </AccordionItem>
              )}
              <AccordionItem title="Delivery & returns">
                <p>
                  {producedToOrder
                    ? `Made for you in ${product.productionDays.standard[0]}–${product.productionDays.standard[1]} business days (express: ${product.productionDays.express[0]}–${product.productionDays.express[1]}), then delivered.`
                    : "Ready to ship."}{" "}
                  Delivery within Nigeria takes {delivery.standardDays[0]}–{delivery.standardDays[1]} business days
                  {delivery.standardFee ? ` from ${formatNaira(delivery.standardFee)}` : ""}.
                </p>
                <p className="mt-2">
                  See our <Link href="/returns-policy" className="underline underline-offset-2">returns &amp; exchanges policy</Link>.
                </p>
              </AccordionItem>
              <AccordionItem title="The craft">
                <p>
                  Cut and sewn by hand in the momen. atelier in Lagos. Patterned cloth is matched at the seams, embroidery placed by hand,
                  and every piece is pressed and inspected before it leaves us.
                </p>
              </AccordionItem>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-24 space-y-24">
        {completeTheLook.length > 0 && <CompleteTheLook anchor={product} items={completeTheLook} />}
        <Reviews productId={product.id} productName={product.name} />
        <ProductRail kicker="Considered pairings" title="You may also like" products={alsoLike} />
        <ProductRail kicker="Your edit" title="Recently viewed" products={recent} />
      </div>

      <SizeGuide product={product} open={guideOpen} onClose={() => setGuideOpen(false)} onPick={(s) => { setSize(s); setSizeError(false); }} />

      {/* Mobile sticky purchase bar */}
      <AnimatePresence>
        {!ctaVisible && !soldOut && (
          <m.div
            className="fixed inset-x-0 bottom-0 z-[70] flex items-center gap-4 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur lg:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.45, ease: EASE_HOUSE }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{product.name}</p>
              <p className="text-sm text-ink/60">{formatNaira(product.price)}{size && !oneSize ? ` · ${size}` : ""}</p>
            </div>
            {product.customizable ? (
              <Link href={`/customize/${product.slug}`} className="bg-ink px-5 py-3 text-sm text-ivory">Design yours</Link>
            ) : (
              <button type="button" onClick={(e) => handleAdd(false, e.currentTarget)} className="bg-ink px-5 py-3 text-sm text-ivory active:scale-[0.98]">
                {size ? "Add to bag" : "Select size"}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Customizable pieces go through the existing wizard (fabric, colour, fit,
 * required style choices); this is its invitation. */
function DesignYours({
  product,
  wished,
  onWish,
  onGuide,
  ctaRef,
}: {
  product: Product;
  wished: boolean;
  onWish: () => void;
  onGuide: () => void;
  ctaRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="mt-8">
      <div className="bg-bone p-6">
        <p className="label text-terracotta">Made for you</p>
        <ol className="mt-4 grid grid-cols-3 gap-3 text-sm">
          {["Choose cloth & colour", "Standard size or your measurements", "Cut & sewn in Lagos"].map((s, i) => (
            <li key={s}>
              <span className="display block text-2xl text-ink">{i + 1}</span>
              <span className="text-ink/70">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-ink/55">
          {product.sizes.length > 0 && <>Standard sizes {product.sizes[0]}–{product.sizes[product.sizes.length - 1]}. </>}
          <button type="button" onClick={onGuide} className="underline underline-offset-2">Size guide</button>
        </p>
      </div>
      <div ref={ctaRef} className="mt-4 flex gap-3">
        <Link
          href={`/customize/${product.slug}`}
          className="flex flex-1 items-center justify-center bg-ink px-6 py-4 text-sm tracking-wide text-ivory transition-colors duration-500 hover:bg-terracotta"
        >
          Design yours
        </Link>
        <WishButton wished={wished} onClick={onWish} />
      </div>
    </div>
  );
}

function WishButton({ wished, onClick }: { wished: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={wished}
      aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
      className={`flex w-14 items-center justify-center border transition-colors ${wished ? "border-terracotta text-terracotta" : "border-line hover:border-ink"}`}
    >
      <m.svg
        key={String(wished)}
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill={wished ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        initial={wished ? { scale: 0.4 } : false}
        animate={{ scale: [wished ? 0.4 : 1, wished ? 1.25 : 1, 1] }}
        transition={{ duration: 0.5, ease: EASE_HOUSE }}
        aria-hidden
      >
        <path d="M10 17.2s-6.7-4.1-6.7-9a3.9 3.9 0 0 1 6.7-2.7A3.9 3.9 0 0 1 16.7 8.2c0 4.9-6.7 9-6.7 9Z" strokeLinejoin="round" />
      </m.svg>
    </button>
  );
}

function StockNote({ product }: { product: Product }) {
  const state = stockState(product);
  const units = availableUnits(product);
  const copy: Record<typeof state, { text: string; tone: string }> = {
    "in-stock": { text: "In stock, ready to ship.", tone: "bg-olive" },
    "low-stock": { text: units > 0 ? `Only ${units} left.` : "Low stock — a few pieces remain.", tone: "bg-terracotta" },
    "made-to-order": { text: "Made to order for you.", tone: "bg-brass" },
    "sold-out": { text: "Sold out for now.", tone: "bg-ink/30" },
  };
  return (
    <p className="mt-4 flex items-center gap-2 text-xs text-ink/70" aria-live="polite">
      <span className={`h-1.5 w-1.5 rounded-full ${copy[state].tone}`} aria-hidden />
      {copy[state].text}
    </p>
  );
}

function NotifyMe({ product, size, color }: { product: Product; size: string | null; color: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email.");
    setError(null);
    setState("sending");
    try {
      await apiRequest("/stock-alerts", {
        method: "POST",
        body: { productId: product.id, email, kind: "back_in_stock", size: size ?? undefined, color: color || undefined },
      });
      setState("done");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Please try again.");
    }
  }

  if (state === "done") {
    return <p role="status" className="mt-8 bg-bone p-5 text-sm text-ink/80">We&rsquo;ll write to {email} the moment {size ? `size ${size}` : "it"}&rsquo;s back.</p>;
  }
  return (
    <form onSubmit={submit} noValidate className="mt-8 bg-bone p-5">
      <p className="text-sm font-medium">{size ? `Size ${size} is sold out.` : "Sold out for now."} Notify me when it&rsquo;s back</p>
      <div className="mt-3 flex gap-2">
        <label htmlFor="notify-email" className="sr-only">Email</label>
        <input
          id="notify-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="min-w-0 flex-1 border-b border-ink/30 bg-transparent py-2 text-sm outline-none focus:border-ink"
        />
        <button type="submit" disabled={state === "sending"} className="bg-ink px-5 text-sm text-ivory disabled:opacity-50">
          {state === "sending" ? "…" : "Notify me"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-error">{error}</p>}
    </form>
  );
}

/** Quiet "tell me if the price drops" link under the price. */
function PriceDropAlert({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email.");
    setError(null);
    setState("sending");
    try {
      await apiRequest("/stock-alerts", { method: "POST", body: { productId: product.id, email, kind: "price_drop" } });
      setState("done");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Please try again.");
    }
  }

  if (state === "done") return <p role="status" className="mt-2 text-xs text-ink/60">We&rsquo;ll tell you if the price drops.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="link-line mt-2 text-xs text-ink/55 hover:text-ink">
        Tell me if the price drops
      </button>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="mt-3 flex max-w-sm gap-2">
      <label htmlFor="price-drop-email" className="sr-only">Email for price-drop alert</label>
      <input
        id="price-drop-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        aria-invalid={Boolean(error)}
        className="min-w-0 flex-1 border-b border-ink/30 bg-transparent py-1.5 text-sm outline-none focus:border-ink"
      />
      <button type="submit" disabled={state === "sending"} className="label text-ink disabled:opacity-40">
        {state === "sending" ? "…" : "Alert me"}
      </button>
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
    </form>
  );
}

function CompleteTheLook({ anchor, items }: { anchor: Product; items: Product[] }) {
  const { addItem } = useCart();
  const { flyToBag } = useUI();
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const sizeFor = (p: Product) => sizes[p.id] ?? (isOneSize(p) ? p.sizes[0] ?? "One Size" : "");
  const available = items.filter((p) => stockState(p) !== "sold-out");

  function add(p: Product, origin?: HTMLElement | null) {
    const s = sizeFor(p);
    if (!s) {
      toast("Choose a size first", { description: p.name });
      return false;
    }
    addItem(p, s, p.colors[0]?.name ?? "", 1);
    flyToBag(p.images[0], origin?.getBoundingClientRect());
    return true;
  }

  return (
    <section aria-labelledby="ctl-heading" className="border-t border-line pt-16">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="label text-clay">Complete the look</p>
          <h2 id="ctl-heading" className="display mt-3 text-4xl">Styled with {anchor.name.split(" ")[0]}</h2>
        </div>
        {available.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              const missing = available.filter((p) => !sizeFor(p));
              if (missing.length) {
                toast("Choose sizes first", { description: missing.map((p) => p.name).join(", ") });
                return;
              }
              available.forEach((p) => add(p, e.currentTarget));
            }}
            className="self-start bg-ink px-6 py-3 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta sm:self-auto"
          >
            Add all {available.length} to bag
          </button>
        )}
      </div>
      <ul className="mt-10 grid gap-8 sm:grid-cols-3">
        {items.map((p) => (
          <li key={p.id} className="group">
            <Link href={`/product/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-bone">
              <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:640px) 30vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-house group-hover:scale-[1.04]" />
            </Link>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <Link href={`/product/${p.slug}`} className="text-sm hover:underline">{p.name}</Link>
                <p className="text-sm text-ink/55">{formatNaira(p.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isOneSize(p) && (
                  <label>
                    <span className="sr-only">Size for {p.name}</span>
                    <select
                      value={sizes[p.id] ?? ""}
                      onChange={(e) => setSizes((s) => ({ ...s, [p.id]: e.target.value }))}
                      className="border-b border-line bg-transparent py-1 text-sm outline-none focus:border-ink"
                    >
                      <option value="" disabled>Size</option>
                      {p.sizes.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  disabled={stockState(p) === "sold-out"}
                  onClick={(e) => add(p, e.currentTarget)}
                  aria-label={`Add ${p.name} to bag`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-lg leading-none transition-colors hover:border-ink hover:bg-ink hover:text-ivory disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dot() {
  return <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-terracotta" />;
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" className="mt-0.5 shrink-0 text-ink/60" aria-hidden>
      <path d="M1.5 5h10v8h-10zM11.5 8h3.5l3 3v2h-6.5" strokeLinejoin="round" />
      <circle cx="5" cy="14.5" r="1.5" />
      <circle cx="15" cy="14.5" r="1.5" />
    </svg>
  );
}
