import type { Metadata } from "next";
import Link from "next/link";
import CampaignMosaic from "@/components/campaign/CampaignMosaic";
import PhotoBanner from "@/components/campaign/PhotoBanner";
import { campaignShots, shots } from "@/lib/campaign-shots";

export const metadata: Metadata = {
  title: "Lookbook | momen.",
  description: "The full momen. campaign: Ankara pants, aso-oke patchwork, jalabia, kaftan, two-piece sets, vintage shirts, linen tees and fila.",
  alternates: { canonical: "/lookbook" },
};

// Alternate between styles so the grid never shows one garment in a long run.
function interleave() {
  const groups = new Map<string, typeof campaignShots[number][]>();
  for (const shot of campaignShots) {
    if (shot.name === "patterned-trousers-trio") continue;
    groups.set(shot.styleSlug, [...(groups.get(shot.styleSlug) ?? []), shot]);
  }
  const queues = [...groups.values()];
  const ordered = [];
  while (queues.some((queue) => queue.length)) for (const queue of queues) if (queue.length) ordered.push(queue.shift()!);
  return ordered;
}

export default function LookbookPage() {
  const [banner] = shots("patterned-trousers-trio");
  return (
    <>
      <PhotoBanner shot={banner} eyebrow="momen. / Lagos" title="Lookbook">
        Every photograph from the campaign. Tap any look to shop the piece.
      </PhotoBanner>
      <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-10 lg:py-14">
        <div className="mb-8 flex flex-wrap gap-3">
          <Link href="/shop" className="bg-ink px-5 py-3 text-sm font-medium text-ivory hover:bg-terracotta">Shop Ready-to-Wear</Link>
          <Link href="/made-to-measure" className="border border-ink/35 px-5 py-3 text-sm font-medium hover:border-ink">Explore Bespoke</Link>
        </div>
        <CampaignMosaic shots={interleave()} priorityCount={8} />
      </div>
    </>
  );
}
