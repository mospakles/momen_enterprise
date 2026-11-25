import Image from "next/image";
import type { ReactNode } from "react";
import type { CampaignShot } from "@/lib/campaign-shots";

/** A full-width photographic page header with the title laid over the image. */
export default function PhotoBanner({
  shot,
  eyebrow,
  title,
  children,
}: {
  shot: CampaignShot;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate flex min-h-[340px] items-end overflow-hidden bg-night text-white sm:min-h-[420px]">
      <Image src={shot.src} alt={shot.alt} fill sizes="100vw" loading="eager" fetchPriority="high"
        className="-z-10 object-cover" style={{ objectPosition: shot.pos }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-night/80 via-night/30 to-night/5" />
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-9 pt-24 sm:px-10 lg:pb-12">
        {eyebrow && <p className="text-sm font-semibold text-white/80">{eyebrow}</p>}
        <h1 className="display mt-2 text-5xl sm:text-6xl">{title}</h1>
        {children && <div className="mt-4 max-w-xl text-base leading-relaxed text-white/85">{children}</div>}
      </div>
    </header>
  );
}
