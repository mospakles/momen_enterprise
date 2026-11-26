import Image from "next/image";
import Link from "next/link";
import type { CampaignShot } from "@/lib/campaign-shots";

function ratio(shot: CampaignShot) {
  if (shot.wide) return "aspect-[3/2]";
  if (shot.name.startsWith("patterned-trousers-group")) return "aspect-square";
  return "aspect-[2/3]";
}

/** Masonry grid of campaign photos; each one links to the piece it shows. */
export default function CampaignMosaic({ shots, priorityCount = 0 }: { shots: readonly CampaignShot[]; priorityCount?: number }) {
  return (
    <ul className="columns-2 gap-3 sm:gap-4 md:columns-3 xl:columns-4">
      {shots.map((shot, i) => (
        <li key={shot.name} className="mb-3 break-inside-avoid sm:mb-4">
          <Link href={shot.href} className="group relative block overflow-hidden bg-bone">
            <div className={`relative ${ratio(shot)}`}>
              <Image src={shot.src} alt={shot.alt} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                loading={i < priorityCount ? "eager" : undefined}
                className="object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: shot.pos }} />
            </div>
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-night/70 to-transparent px-3 pb-2.5 pt-8 text-sm text-white opacity-100 transition-opacity duration-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
              {shot.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
