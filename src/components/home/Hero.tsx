import Image from "next/image";
import { Button } from "@/components/ui/Button";

export interface HeroContent {
  headline?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaLabel2?: string;
  ctaHref2?: string;
  image?: string;
}

export default function Hero({ content }: { content?: HeroContent }) {
  const headline = content?.headline || "Designed for the Man You Are.";
  const subheading = content?.subheading || "Contemporary menswear, thoughtfully crafted for confidence, comfort and individuality.";
  const ctaLabel = content?.ctaLabel || "Shop Men's Collection";
  const ctaHref = content?.ctaHref || "/shop";
  const ctaLabel2 = content?.ctaLabel2 || "Explore Made-to-Measure";
  const ctaHref2 = content?.ctaHref2 || "/made-to-measure";
  const image = content?.image || "https://picsum.photos/seed/momen-hero-men/1800/1300";

  return (
    <section className="relative flex min-h-[88vh] items-end overflow-hidden bg-charcoal">
      <Image
        src={image}
        alt="Momen menswear editorial"
        fill
        priority
        unoptimized={!image.includes("picsum.photos")}
        className="object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <p className="eyebrow fade-up text-stone-light">Modern African Menswear · Lagos</p>
        <h1
          className="fade-up mt-4 max-w-2xl font-display text-5xl italic leading-[1.05] text-ivory sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "80ms" }}
        >
          {headline}
        </h1>
        <p
          className="fade-up mt-5 max-w-md text-base text-stone-light sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          {subheading}
        </p>
        <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
          <Button href={ctaHref} size="lg">
            {ctaLabel}
          </Button>
          <Button href={ctaHref2} variant="outline-light" size="lg">
            {ctaLabel2}
          </Button>
        </div>
      </div>
    </section>
  );
}
