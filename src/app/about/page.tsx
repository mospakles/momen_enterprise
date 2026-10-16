import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal, ClipReveal } from "@/lib/motion/Reveal";
import { SplitText } from "@/lib/motion/SplitText";
import { MEDIA, focal } from "@/components/journey/media";
import { placeholderFor } from "@/lib/brand-images";

export const metadata: Metadata = {
  title: "The house — momen.",
  description: "momen. is an African clothing house in Lagos: heritage garments cut with a modern hand, ready-to-wear and made to measure.",
};

// ── Founder copy ─────────────────────────────────────────────────────────────
// DRAFT: written for the founder to edit into their own words before launch.
const FOUNDER = {
  name: "Motunrayo Odusina",
  role: "Founder & Creative Director",
  heading: "Started with one belief.",
  note: [
    "momen. began in Lagos with a simple belief: the clothes we wear to our biggest moments should be built around the person wearing them — not around an average that nobody actually is.",
    "I grew up surrounded by aso-oke, ankara and the tailors who turned them into something people were proud to be photographed in. momen. is my way of keeping that craft close, and drawing it with a cleaner, more modern line.",
    "Every piece still passes through the hands of a tailor in our atelier. That part will never change.",
  ],
  signoff: "With love, from the house.",
};

const VALUES = [
  {
    title: "Craftsmanship",
    body: "Every garment passes through the hands of our Lagos pattern cutters and tailors before it reaches yours. We work in small batches so quality never trails behind volume.",
  },
  {
    title: "Attention to fit",
    body: "Our made-to-measure process feels closer to a fitting room than a form. Guided steps walk you through every measurement, and your profile is saved for every order after.",
  },
  {
    title: "Quality",
    body: "We choose the cloth first and build the silhouette around it — natural fibres, durable construction, and finishing you notice on the tenth wear, not just the first.",
  },
  {
    title: "Design philosophy",
    body: "Quiet, considered silhouettes that outlast trend cycles. We would rather you wear a momen. piece for years than replace it each season.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section data-tone="dark" className="relative flex h-[78vh] min-h-[480px] items-end overflow-hidden bg-night">
        <Image src={MEDIA.aboutHero.src} alt={MEDIA.aboutHero.alt} fill preload sizes="100vw" placeholder={placeholderFor(MEDIA.aboutHero.src)} style={focal(MEDIA.aboutHero).style} className={`object-cover opacity-90 ${focal(MEDIA.aboutHero).className}`} />
        <div className="absolute inset-0 bg-linear-to-t from-night/90 via-night/25 to-night/30" />
        <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-14 sm:px-10 lg:px-16 lg:pb-20">
          <p className="label text-sand">The house</p>
          <SplitText
            as="h1"
            trigger="manual"
            text={"Clothing built around\nthe person wearing it."}
            className="display mt-5 max-w-[18ch] text-[clamp(2.6rem,6.5vw,6rem)] italic text-bone"
          />
        </div>
      </section>

      {/* About the house — founder */}
      <section aria-labelledby="founder-heading" className="mx-auto max-w-[1600px] px-5 py-24 sm:px-10 lg:grid lg:grid-cols-12 lg:gap-10 lg:px-16 lg:py-36">
        <div className="lg:col-span-5">
          <ClipReveal className="relative aspect-[4/5] w-full bg-bone">
            {/* Founder portraits are awaiting clean (unwatermarked) files — see
                brand/CURATION.md. The atelier stands in until then. */}
            <Image src={MEDIA.aboutFounder.src} alt={MEDIA.aboutFounder.alt} fill sizes="(min-width:1024px) 40vw, 100vw" placeholder={placeholderFor(MEDIA.aboutFounder.src)} style={focal(MEDIA.aboutFounder).style} className={`object-cover ${focal(MEDIA.aboutFounder).className}`} />
          </ClipReveal>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <ClipReveal className="relative aspect-square w-full bg-bone" delay={0.15}>
              <Image src={MEDIA.aboutFounderDetails[0].src} alt={MEDIA.aboutFounderDetails[0].alt} fill sizes="(min-width:1024px) 20vw, 50vw" placeholder={placeholderFor(MEDIA.aboutFounderDetails[0].src)} className="object-cover" />
            </ClipReveal>
            <ClipReveal className="relative aspect-square w-full bg-bone" delay={0.25}>
              <Image src={MEDIA.aboutFounderDetails[1].src} alt={MEDIA.aboutFounderDetails[1].alt} fill sizes="(min-width:1024px) 20vw, 50vw" placeholder={placeholderFor(MEDIA.aboutFounderDetails[1].src)} className="object-cover" />
            </ClipReveal>
          </div>
        </div>

        <div className="mt-14 lg:col-span-6 lg:col-start-7 lg:mt-0 lg:pt-16">
          <p className="label text-clay">About the house — the founder</p>
          <SplitText as="h2" text={FOUNDER.heading} className="display mt-5 text-[clamp(2.4rem,5vw,4.5rem)]" />
          <span id="founder-heading" className="sr-only">About the founder</span>
          <Reveal delay={0.15}>
            <div className="mt-8 max-w-xl space-y-5 text-[1.02rem] leading-relaxed text-ink/75">
              {FOUNDER.note.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p className="mt-8 font-display text-xl italic text-ink/70">{FOUNDER.signoff}</p>
            <div className="mt-6 border-t border-line pt-5">
              <p className="display text-2xl">{FOUNDER.name}</p>
              <p className="label mt-1 text-ink/50">{FOUNDER.role}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="bg-bone/60 px-5 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-[1600px]">
          <p className="label text-clay">What we hold to</p>
          <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <span className="display text-4xl text-ink/25">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display mt-4 text-2xl">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Atelier + process */}
      <section className="mx-auto grid max-w-[1600px] items-center gap-12 px-5 py-24 sm:px-10 lg:grid-cols-12 lg:px-16 lg:py-36">
        <ClipReveal from="left" className="relative aspect-[4/3] w-full bg-bone lg:col-span-7">
          <Image src={MEDIA.aboutAtelier.src} alt={MEDIA.aboutAtelier.alt} fill sizes="(min-width:1024px) 55vw, 100vw" placeholder={placeholderFor(MEDIA.aboutAtelier.src)} style={focal(MEDIA.aboutAtelier).style} className={`object-cover ${focal(MEDIA.aboutAtelier).className}`} />
        </ClipReveal>
        <div className="lg:col-span-4 lg:col-start-9">
          <p className="label text-clay">The made-to-measure process</p>
          <h2 className="display mt-5 text-[clamp(2rem,3.6vw,3.2rem)]">From your numbers to a pattern of one.</h2>
          <Reveal>
            <p className="mt-6 text-sm leading-relaxed text-ink/70">
              You choose a piece, share measurements you already have or work through our guided steps, and our pattern cutters translate
              those numbers into a paper pattern unique to you. Every piece is then cut, sewn and finished by hand — checked at three stages
              before it ships.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/made-to-measure" className="bg-ink px-6 py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta">
                Book a fitting
              </Link>
              <Link href="/shop" className="label link-line self-center text-ink">
                Enter the collection
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
