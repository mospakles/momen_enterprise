"use client";

// Catalogue card. Large image that crossfades to a second view on hover,
// colour swatches, and quick-add: sizes slide up over the image on hover
// (desktop) or on long-press / the + button (touch). Customizable pieces
// point to "Design yours" instead, since they need the wizard.

import Image from "next/image";
import { placeholderFor } from "@/lib/brand-images";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Product } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useUI } from "@/lib/ui-context";
import { isMadeToMeasure, isOneSize, stockState } from "@/lib/product-utils";
import { track } from "@/lib/analytics";
import { EASE_HOUSE } from "@/lib/motion/ease";

export default function ProductCard({ product, priority = false, sizes = "(min-width: 1024px) 25vw, 50vw" }: { product: Product; priority?: boolean; sizes?: string }) {
  const { toggleWishlist, isWishlisted, addItem } = useCart();
  const { flyToBag } = useUI();
  const [quick, setQuick] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wished = isWishlisted(product.id);
  const stock = stockState(product);
  const soldOut = stock === "sold-out";
  const second = product.hoverImage ?? product.images[1];
  const oneSize = isOneSize(product);

  function quickAdd(size: string) {
    addItem(product, size, product.colors[0]?.name ?? "", 1);
    flyToBag(product.images[0], imageRef.current?.getBoundingClientRect());
    setQuick(false);
  }

  const badge = soldOut
    ? "Sold out"
    : stock === "low-stock"
      ? "Last few"
      : product.isNew
        ? "New"
        : isMadeToMeasure(product) || product.customizable
          ? "To measure"
          : null;

  return (
    <article className="group relative" onMouseLeave={() => setQuick(false)}>
      <div
        ref={imageRef}
        className="relative aspect-3/4 overflow-hidden bg-bone"
        onTouchStart={() => {
          press.current = setTimeout(() => setQuick(true), 450);
        }}
        onTouchEnd={() => press.current && clearTimeout(press.current)}
        onTouchMove={() => press.current && clearTimeout(press.current)}
        onContextMenu={(e) => quick && e.preventDefault()}
      >
        <Link href={`/product/${product.slug}`} aria-label={product.name} data-cursor="View" className="absolute inset-0">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            preload={priority}
            placeholder={placeholderFor(product.images[0])}
            sizes={sizes}
            className={`object-cover transition-[opacity,transform] duration-900 ease-house group-hover:scale-[1.03] ${second ? "group-hover:opacity-0" : ""}`}
          />
          {second && (
            <Image
              src={second}
              alt=""
              fill
              sizes={sizes}
              className="scale-[1.03] object-cover opacity-0 transition-[opacity,transform] duration-900 ease-house group-hover:scale-100 group-hover:opacity-100"
            />
          )}
        </Link>

        {badge && <span className="label pointer-events-none absolute left-2 top-2 max-w-[calc(100%-3.5rem)] truncate bg-ivory/95 px-2 py-1 text-[0.56rem] text-ink sm:left-3 sm:top-3">{badge}</span>}

        <button
          type="button"
          onClick={() => {
            if (!wished) track("add_to_wishlist", { items: [{ item_id: product.id, item_name: product.name }] });
            toggleWishlist(product.id);
          }}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={wished}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-ink transition-transform duration-300 hover:scale-110 active:scale-90"
        >
          <span className="absolute inset-1 rounded-full bg-ivory/80 backdrop-blur-sm" aria-hidden />
          <m.svg
            key={String(wished)}
            className="relative"
            width="15"
            height="15"
            viewBox="0 0 20 20"
            fill={wished ? "var(--color-terracotta)" : "none"}
            stroke={wished ? "var(--color-terracotta)" : "currentColor"}
            strokeWidth="1.4"
            initial={wished ? { scale: 0.3 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            aria-hidden
          >
            <path d="M10 17.2s-6.7-4.1-6.7-9a3.9 3.9 0 0 1 6.7-2.7A3.9 3.9 0 0 1 16.7 8.2c0 4.9-6.7 9-6.7 9Z" strokeLinejoin="round" />
          </m.svg>
        </button>

        {/* Touch affordance for quick add */}
        {!soldOut && (
          <button
            type="button"
            onClick={() => setQuick((v) => !v)}
            aria-label={`Quick add ${product.name}`}
            aria-expanded={quick}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-ivory/90 text-lg leading-none text-ink backdrop-blur-sm [@media(hover:hover)]:hidden"
          >
            {quick ? "×" : "+"}
          </button>
        )}

        {/* Quick add panel: hover on desktop, toggled on touch */}
        {!soldOut && (
          <AnimatePresence>
            {quick && (
              <QuickPanel product={product} oneSize={oneSize} onAdd={quickAdd} key="touch" />
            )}
          </AnimatePresence>
        )}
        {!soldOut && (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-3 opacity-0 transition-all duration-500 ease-house group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:block">
            <QuickPanelBody product={product} oneSize={oneSize} onAdd={quickAdd} />
          </div>
        )}
      </div>

      <Link href={`/product/${product.slug}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[0.92rem] leading-snug text-ink">{product.name}</h3>
          <div className="shrink-0 text-right">
            <p className="text-[0.92rem]">{formatNaira(product.price)}</p>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <p className="text-xs text-ink/40 line-through">{formatNaira(product.compareAtPrice)}</p>
            )}
          </div>
        </div>
      </Link>
      {product.colors.length > 1 && (
        <div className="mt-2 flex items-center gap-1.5" aria-label={`Available in ${product.colors.map((c) => c.name).join(", ")}`}>
          {product.colors.slice(0, 5).map((c) => (
            <span key={c.name} title={c.name} className="h-2.5 w-2.5 rounded-full border border-ink/15" style={{ backgroundColor: c.hex }} />
          ))}
          {product.colors.length > 5 && <span className="text-[11px] text-ink/50">+{product.colors.length - 5}</span>}
        </div>
      )}
    </article>
  );
}

function QuickPanel({ product, oneSize, onAdd }: { product: Product; oneSize: boolean; onAdd: (size: string) => void }) {
  return (
    <m.div
      className="absolute inset-x-2 bottom-12 [@media(hover:hover)]:hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: EASE_HOUSE }}
    >
      <QuickPanelBody product={product} oneSize={oneSize} onAdd={onAdd} />
    </m.div>
  );
}

function QuickPanelBody({ product, oneSize, onAdd }: { product: Product; oneSize: boolean; onAdd: (size: string) => void }) {
  if (product.customizable) {
    return (
      <Link href={`/customize/${product.slug}`} className="block bg-ivory/95 px-4 py-3 text-center text-xs tracking-wide text-ink backdrop-blur transition-colors hover:bg-ink hover:text-ivory">
        Design yours →
      </Link>
    );
  }
  if (oneSize) {
    return (
      <button type="button" onClick={() => onAdd(product.sizes[0] ?? "One Size")} className="block w-full bg-ivory/95 px-4 py-3 text-xs tracking-wide text-ink backdrop-blur transition-colors hover:bg-ink hover:text-ivory">
        Add to bag
      </button>
    );
  }
  return (
    <div className="bg-ivory/95 p-2.5 backdrop-blur">
      <p className="label mb-2 text-center text-[0.56rem] text-ink/60">Quick add</p>
      <div className="flex flex-wrap justify-center gap-1">
        {product.sizes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onAdd(s)}
            disabled={product.sizeStock?.[s] === 0}
            aria-label={product.sizeStock?.[s] === 0 ? `Size ${s} sold out` : `Add ${product.name}, size ${s}, to bag`}
            className="min-w-9 px-2 py-1.5 text-xs text-ink transition-colors hover:bg-ink hover:text-ivory disabled:pointer-events-none disabled:text-ink/30 disabled:line-through"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
