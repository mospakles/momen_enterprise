"use client";

import Image from "next/image";
import Link from "next/link";
import PhotoStrip from "@/components/campaign/PhotoStrip";
import { CampaignRange } from "@/components/collection/CampaignRange";
import { shots } from "@/lib/campaign-shots";
import { useAdminStore } from "@/lib/admin/store";
import { bespoke, campaignPhoto } from "@/lib/campaign-catalogue";

export default function MadeToMeasurePage() {
  const { products } = useAdminStore();
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-10 lg:py-14">
      <header className="mb-10 grid overflow-hidden bg-[#e8e0d1] md:grid-cols-[1fr_0.75fr] lg:mb-14">
        <div className="flex flex-col justify-center px-6 py-9 sm:px-10 lg:p-14">
          <h1 className="display text-5xl sm:text-6xl">Bespoke</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/75">
            Choose an agbada, senator, kaftan, jalabia or two-piece set. We’ll help you confirm the measurements and details for your piece.
          </p>
          <Link href="/measurements" className="mt-5 self-start border-b border-current pb-1 text-sm font-medium">View the measurement guide</Link>
        </div>
        <div className="relative min-h-[240px] md:min-h-[310px]">
          <Image src={campaignPhoto("blue-geometric-set-seated-wide")} alt="A man wearing the sky-blue kaftan with a geometric placket"
            fill sizes="(min-width: 768px) 45vw, 100vw" preload className="object-cover object-[50%_25%]" />
        </div>
      </header>
      <h2 className="display mb-6 text-3xl">Choose your style</h2>
      <CampaignRange styles={bespoke} products={products} madeToMeasure />
      <div className="-mx-5 mt-14 sm:-mx-10">
        <PhotoStrip title="Made for the occasion" linkHref="/lookbook" shots={shots(
          "blue-geometric-set-portrait", "burgundy-robe-full-length", "blue-geometric-set-front",
          "burgundy-robe-detail", "ivory-textured-set-portrait", "blue-geometric-set-full-length", "ivory-and-blue-sets",
        )} className="py-0 lg:py-0" />
      </div>
    </div>
  );
}
