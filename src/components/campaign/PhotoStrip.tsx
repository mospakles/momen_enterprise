import Image from "next/image";
import Link from "next/link";
import type { CampaignShot } from "@/lib/campaign-shots";

/** A horizontally scrolling row of campaign photos, each linking to its piece. */
export default function PhotoStrip({
  title = "From the campaign",
  shots,
  linkHref = "/lookbook",
  linkLabel = "View the lookbook",
  className = "",
}: {
  title?: string;
  shots: readonly CampaignShot[];
  linkHref?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <section className={`py-12 lg:py-16 ${className}`} aria-label={title}>
      <div className="mx-auto mb-6 flex max-w-[1600px] flex-wrap items-end justify-between gap-4 px-5 sm:px-10">
        <h2 className="display text-3xl sm:text-4xl">{title}</h2>
        {linkHref && <Link href={linkHref} className="border-b border-current pb-1 text-sm font-medium">{linkLabel}</Link>}
      </div>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 sm:gap-4 sm:px-10 [scrollbar-width:thin]">
        {shots.map((shot) => (
          <li key={shot.name} className={`shrink-0 snap-start ${shot.wide ? "w-[80vw] sm:w-[34rem]" : "w-[62vw] sm:w-[17rem] lg:w-[19rem]"}`}>
            <Link href={shot.href} className="group block">
              <div className={`relative overflow-hidden bg-bone ${shot.wide ? "aspect-[3/2]" : "aspect-[3/4]"}`}>
                <Image src={shot.src} alt={shot.alt} fill sizes="(min-width: 640px) 20rem, 62vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: shot.pos }} />
              </div>
              <p className="mt-2 text-sm text-ink/70 group-hover:text-ink">{shot.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
