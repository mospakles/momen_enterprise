import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { campaignPhoto, campaignPrice, campaignProductSlug, findCampaignProduct, offeredColours, type CampaignStyle } from "@/lib/campaign-catalogue";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";

export function CampaignRange({
  styles,
  products = [],
  madeToMeasure = false,
}: {
  styles: readonly CampaignStyle[];
  products?: readonly Product[];
  madeToMeasure?: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
      {styles.flatMap((style) => {
        const slug = campaignProductSlug(style, madeToMeasure);
        const product = findCampaignProduct(products, slug);
        const price = campaignPrice(style, madeToMeasure);
        if (product && !madeToMeasure) return [<li key={slug}><ProductCard product={product} /></li>];
        // One card per colourway, so every print shows in the grid.
        const colours = offeredColours(style, madeToMeasure);
        const multi = colours.length > 1;
        return colours.map((colour, i) => {
          const base = product?.customizable && madeToMeasure ? `/customize/${slug}` : `/product/${slug}`;
          return (
            <li key={`${slug}-${colour.name}`}>
              <Link href={multi && i > 0 ? `${base}?colour=${encodeURIComponent(colour.name)}` : base} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-bone">
                  <Image
                    src={campaignPhoto(colour.photos[0])}
                    alt={`${style.name}${multi ? ` in ${colour.name}` : ""}`}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover object-[50%_30%] transition-transform duration-500 group-hover:scale-105"
                  />
                  {colour.illustration && (
                    <span className="absolute bottom-2 left-2 bg-ivory/90 px-2 py-1 text-[11px] font-medium text-ink/80">
                      Style illustration{colour.photos.length > 1 ? ` · ${colour.photos.length} looks` : ""}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-xl leading-tight sm:text-2xl">{style.name}</h2>
                {multi && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/70">
                    <span aria-hidden className="size-3 rounded-full border border-ink/15" style={{ backgroundColor: colour.hex }} />
                    {colour.name}
                  </p>
                )}
                {price && <p className="mt-1.5 text-sm text-ink/75">{formatNaira(price)}</p>}
              </Link>
            </li>
          );
        });
      })}
    </ul>
  );
}
