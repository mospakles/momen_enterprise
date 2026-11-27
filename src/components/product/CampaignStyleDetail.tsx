"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminStore } from "@/lib/admin/store";
import { bespokeSlug, campaignPhoto, campaignPrice, campaignSizes, casualsCollection, offeredColours, type CampaignStyle } from "@/lib/campaign-catalogue";
import { formatNaira } from "@/lib/format";
import { Gallery, type Media } from "./pdp/Gallery";
import { WelcomeNote } from "@/components/layout/WelcomeOffer";

export default function CampaignStyleDetail({ style, madeToMeasure }: { style: CampaignStyle; madeToMeasure: boolean }) {
  const requested = useSearchParams().get("colour");
  const colours = offeredColours(style, madeToMeasure);
  const [selected, setSelected] = useState(() => Math.max(0, colours.findIndex((colour) => colour.name === requested)));
  const [size, setSize] = useState("");
  const { systemSettings } = useAdminStore();
  const colour = colours[selected] ?? colours[0];
  const price = campaignPrice(style, madeToMeasure);
  const sizes = campaignSizes(style, madeToMeasure);
  const media: Media[] = colour.photos.map((photo) => ({ type: "image", src: campaignPhoto(photo) }));
  const email = systemSettings.general.supportEmail || "hello@momenclothing.com";
  const parent = style.collection === "casuals" ? casualsCollection : madeToMeasure
    ? { href: "/made-to-measure", name: "Bespoke" }
    : { href: "/shop", name: "Ready-to-Wear" };
  const subject = madeToMeasure ? `Bespoke order: ${style.name}` : `Order: ${style.name}`;
  const enquiry = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(madeToMeasure
    ? `Hello momen.,\n\nI'd like to order ${style.name}${colour.illustration && colours.length === 1 ? "" : ` in ${colour.name}`}, made to my measurements.${colour.photos.length > 1 ? "\n\nThe look I like: " : ""}`
    : `Hello momen.,\n\nI'd like to order ${style.name} in ${colour.name}${size ? `, size ${size}` : ""}.`,
  )}`;

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-16 pt-7 sm:px-10 lg:pt-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link href={parent.href} className="underline underline-offset-4">{parent.name}</Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div>
          <Gallery key={colour.name} media={media} name={`${style.name}, ${colour.name}`} />
          {colour.illustration && (
            <p className="mt-3 text-sm text-ink/65">{colour.photos.length > 1 ? "Style illustrations" : "Style illustration"}. Your piece is cut to order in your choice of fabric.</p>
          )}
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h1 className="display text-4xl sm:text-5xl">{style.name}</h1>
          {price && <p className="mt-3 text-lg">{formatNaira(price)}</p>}
          {price && <WelcomeNote price={price} className="mt-1" />}
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/75">{style.description}</p>
          {colours.length === 1 && colour.illustration ? (
            <p className="mt-6 max-w-md text-sm text-ink/75">
              <span className="font-medium text-ink">Fabric and colour:</span> your choice. Browse the {colour.photos.length} looks and tell us which you like.
            </p>
          ) : (
            <fieldset className="mt-6">
              <legend className="text-sm font-medium">Colour or print</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {colours.map((option, i) => (
                  <button key={option.name} type="button" aria-pressed={i === selected} onClick={() => setSelected(i)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${i === selected ? "border-ink" : "border-line hover:border-ink"}`}>
                    <span aria-hidden className="size-3.5 rounded-full border border-ink/15" style={{ backgroundColor: option.hex }} />
                    {option.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {sizes.length > 0 && (
            <label className="mt-5 block max-w-56">
              <span className="block text-sm font-medium">{style.slug === "fila" ? "Fila size" : "Size"}</span>
              <select value={size} onChange={(event) => setSize(event.target.value)}
                className="mt-2 w-full rounded border border-line bg-ivory px-3 py-2.5 text-sm focus:border-ink">
                <option value="">Choose a size</option>
                {sizes.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          )}
          <a href={enquiry} className="mt-7 inline-flex bg-ink px-5 py-3 text-sm font-medium text-ivory hover:bg-terracotta">
            {madeToMeasure ? "Order bespoke" : "Order now"}
          </a>
          {!madeToMeasure && <p className="mt-3 max-w-sm text-sm text-ink/70">In stock and ready to ship. Choose your size and we’ll confirm your order.</p>}
          {madeToMeasure && <p className="mt-3 max-w-sm text-sm text-ink/70">Made to your measurements. We’ll confirm your measurements and delivery timing with you.</p>}
          <div className="mt-6 flex flex-wrap gap-5 text-sm">
            <Link href="/measurements" className="underline underline-offset-4">Size &amp; fit</Link>
            {style.readyToWear && style.bespoke && (
              <Link href={`/product/${madeToMeasure ? style.slug : bespokeSlug(style)}`} className="underline underline-offset-4">
                {madeToMeasure ? "View Ready-to-Wear" : "View Bespoke option"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
