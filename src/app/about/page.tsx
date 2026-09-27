import Image from "next/image";

export default function AboutPage() {
  return (
    <div>
      <div className="relative flex h-[60vh] min-h-[380px] items-end overflow-hidden bg-charcoal">
        <Image
          src="https://picsum.photos/seed/momen-about-hero/1800/1100"
          alt="Momen atelier"
          fill
          className="object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <p className="eyebrow text-brass-light">Our Story</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl italic text-ivory sm:text-5xl">
            Clothing built around the person wearing it.
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="eyebrow">Who We Are</p>
        <p className="mt-3 text-lg leading-relaxed text-ink/80">
          Momen began with a simple frustration: too much clothing is designed for an average
          that no one actually is. We build every made-to-measure piece around your own form —
          not a size chart — and we hold ready-to-wear pieces to the same standard of fit and
          finish.
        </p>

        <div className="mt-14 grid gap-10 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Craftsmanship</p>
            <p className="text-sm leading-relaxed text-ink/70">
              Every garment passes through the hands of our Lagos atelier&apos;s pattern cutters and
              tailors before it reaches yours. We work in small batches so quality never trails
              behind volume.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">Attention to Fit</p>
            <p className="text-sm leading-relaxed text-ink/70">
              Our made-to-measure process was built to feel closer to a fitting room than a form.
              Guided illustrations walk you through every measurement, and your profile is saved
              for every order after.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">Quality</p>
            <p className="text-sm leading-relaxed text-ink/70">
              We choose fabric first and build the silhouette around it — natural fibres, durable
              construction, and finishing details you notice on the tenth wear, not just the
              first.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">Design Philosophy</p>
            <p className="text-sm leading-relaxed text-ink/70">
              Quiet, considered silhouettes that outlast trend cycles. We would rather you wear a
              Momen piece for years than replace it each season.
            </p>
          </div>
        </div>

        <div className="relative mt-16 aspect-[16/9] overflow-hidden bg-ivory-deep">
          <Image src="https://picsum.photos/seed/momen-atelier/1600/900" alt="Inside the Momen atelier" fill className="object-cover" />
        </div>

        <div className="mt-16">
          <p className="eyebrow mb-2">The Made-to-Measure Process</p>
          <p className="text-sm leading-relaxed text-ink/70">
            You choose a piece, provide measurements you already have or work through our guided
            process, and our pattern cutters translate those numbers into a paper pattern unique
            to you. Every piece is then cut, sewn, and finished by hand — checked at three stages
            of quality control before it ships.
          </p>
        </div>
      </div>
    </div>
  );
}
