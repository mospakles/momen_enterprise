import Image from "next/image";
import Link from "next/link";
import CampaignMosaic from "@/components/campaign/CampaignMosaic";
import { campaignCollections } from "@/lib/campaign-catalogue";
import { shots } from "@/lib/campaign-shots";

export default function CollectionsPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-11 sm:px-10 lg:py-16">
      <h1 className="display text-5xl sm:text-6xl">Collections</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {campaignCollections.map((collection) => (
          <Link key={collection.slug} href={collection.href} className="group block bg-bone">
            <div className="relative aspect-[5/4] overflow-hidden">
              <Image src={collection.image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover object-[50%_28%] transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-6 lg:p-8">
              <h2 className="display text-3xl sm:text-4xl">{collection.name}</h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ink/75">{collection.description}</p>
              <span className="mt-5 inline-block border-b border-current pb-1 text-sm font-medium">Explore {collection.name}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
        <h2 className="display text-4xl">From the lookbook</h2>
        <Link href="/lookbook" className="border-b border-current pb-1 text-sm font-medium">View every look</Link>
      </div>
      <div className="mt-6">
        <CampaignMosaic shots={shots(
          "patterned-trousers-group-front", "blue-geometric-set-seated", "burgundy-robe-front", "cobalt-tan-cuff-trousers-back",
          "ivory-textured-set-front", "landscape-print-shirt-back", "patchwork-trousers-studio", "cobalt-striped-cuff-trousers-front",
          "blue-abstract-shirt-side", "ivory-woven-panel-shirt-front", "black-geometric-trousers-side", "patterned-trousers-group-side",
        )} />
      </div>
    </div>
  );
}
