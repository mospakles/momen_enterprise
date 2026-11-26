import Link from "next/link";
import CampaignMosaic from "@/components/campaign/CampaignMosaic";
import PhotoStrip from "@/components/campaign/PhotoStrip";
import { CampaignRange } from "@/components/collection/CampaignRange";
import { readyToWear } from "@/lib/campaign-catalogue";
import { shots } from "@/lib/campaign-shots";
import Craft from "./Craft";
import Hero from "./Hero";
import Story from "./Story";

const campaign = shots(
  "cobalt-trousers-duo-front", "burgundy-robe-full-length", "ivory-and-blue-sets", "blue-geometric-set-seated-wide",
  "cobalt-tan-cuff-trousers-motion", "patchwork-trousers-full-length", "landscape-print-shirt-front", "ivory-woven-panel-shirt-front",
  "black-geometric-trousers-front", "ivory-textured-set-portrait", "blue-abstract-shirt-front", "cobalt-striped-cuff-trousers-styled",
);

const details = shots(
  "patterned-trousers-trio", "burgundy-robe-detail", "ivory-woven-panel-shirt-detail", "cobalt-striped-cuff-trousers-detail",
  "ivory-textured-polo-detail", "black-geometric-trousers-side-detail", "blue-cap-detail", "burgundy-striped-cap-front",
  "patchwork-trousers-profile", "white-cap-profile", "black-cap-profile",
);

export default function Journey() {
  const featured = readyToWear.filter((style) => ["ankara-pants", "aso-oke-patchwork-pants", "jalabia", "vintage-shirt"].includes(style.slug));
  return (
    <>
      <Hero />
      <section className="mx-auto max-w-[1600px] px-5 py-14 sm:px-10 lg:py-20" aria-labelledby="ready-to-wear-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <h2 id="ready-to-wear-heading" className="display text-4xl sm:text-5xl">Ready-to-Wear</h2>
          <Link href="/shop" className="border-b border-current pb-1 text-sm font-medium">Shop all Ready-to-Wear</Link>
        </div>
        <CampaignRange styles={featured} />
      </section>
      <section className="bg-[#efe9dc] py-14 lg:py-20" aria-labelledby="campaign-heading">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="campaign-heading" className="display text-4xl sm:text-5xl">The campaign</h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ink/75">Ankara, aso-oke and linen, photographed in Lagos. Tap a look to shop it.</p>
            </div>
            <Link href="/lookbook" className="border-b border-current pb-1 text-sm font-medium">View the full lookbook</Link>
          </div>
          <CampaignMosaic shots={campaign} />
        </div>
      </section>
      <Story />
      <Craft />
      <PhotoStrip title="In the details" shots={details} />
    </>
  );
}
