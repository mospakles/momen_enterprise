import Image from "next/image";
import Link from "next/link";
import { campaignPhoto } from "@/lib/campaign-catalogue";

export default function Story() {
  return (
    <section className="grid bg-[#ded6c8] lg:grid-cols-2" aria-labelledby="cloth-heading">
      <div className="relative aspect-[5/4] min-h-72 lg:aspect-auto">
        <Image src={campaignPhoto("patchwork-trousers-detail")} alt="Colourful woven aso-oke patches on the leg of a pair of trousers"
          fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[50%_63%]" />
      </div>
      <div className="px-6 py-11 sm:p-12 lg:p-[clamp(3rem,7vw,7rem)]">
        <h2 id="cloth-heading" className="display text-4xl sm:text-5xl">The cloth sets the tone</h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-ink/75">
          Ankara brings pattern to the trousers. Aso-oke appears as colourful patches and as a striped panel across an ivory linen tee.
        </p>
        <h3 className="mt-9 font-display text-2xl">Make it yours</h3>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-ink/75">
          Choose a kaftan, jalabia, two-piece set, linen tee or fila through Bespoke. We’ll talk through your measurements and the details you want.
        </p>
        <Link href="/made-to-measure" className="mt-6 inline-block border-b border-current pb-1 text-sm font-medium">Browse Bespoke styles</Link>
      </div>
    </section>
  );
}
