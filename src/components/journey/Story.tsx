"use client";

// "Who we are" — on desktop the image column stays pinned while four short
// chapters scroll past; each chapter swaps the pinned image with a mask
// reveal. On mobile each chapter carries its own image inline.

import Image from "next/image";
import { useState } from "react";
import { m } from "motion/react";
import { ClipReveal, Reveal } from "@/lib/motion/Reveal";
import { SplitText } from "@/lib/motion/SplitText";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { MEDIA, focal } from "./media";
import { placeholderFor } from "@/lib/brand-images";

const CHAPTERS = [
  {
    kicker: "I — The cloth",
    title: "It begins with the cloth.",
    body: "Aso-oke woven in narrow strips and joined by hand. Brocade with weight to it. Linen that breathes in the Lagos heat. We choose fabric the way our fathers did: by touch, then by eye.",
  },
  {
    kicker: "II — The hands",
    title: "Then, the hands.",
    body: "Every piece passes through the hands of a tailor who knows the difference a quarter-inch makes. Measured, chalked, cut and sewn in our Lagos atelier — never rushed.",
  },
  {
    kicker: "III — The line",
    title: "A modern line.",
    body: "The agbada, the kaftan, the senator — garments with centuries behind them, drawn with a cleaner shoulder and a sharper fall. Heritage, edited.",
  },
  {
    kicker: "IV — The man",
    title: "Made for the man you are.",
    body: "Not a costume for the occasion. Clothes that sit as easily at a wedding as at a Wednesday — worn with the quiet confidence of something made for you.",
  },
];

export default function Story() {
  const [active, setActive] = useState(0);

  return (
    <section aria-labelledby="story-heading" className="relative bg-ivory">
      <div className="px-5 pb-10 pt-28 sm:px-10 lg:px-16 lg:pt-40">
        <p className="label text-clay">Who we are</p>
        <SplitText
          as="h2"
          text={"A house built on\ncloth, hands and time."}
          className="display mt-5 max-w-[18ch] text-[clamp(2.4rem,6vw,5.5rem)]"
        />
        <span id="story-heading" className="sr-only">Who we are</span>
      </div>

      <div className="lg:grid lg:grid-cols-2">
        {/* Pinned image column (desktop) */}
        <div className="relative hidden lg:block">
          <div className="sticky top-0 h-screen p-16 pr-8">
            <div className="relative h-full w-full overflow-hidden bg-bone">
              {MEDIA.story.map((image, i) => (
                <m.div
                  key={image.src + i}
                  className="absolute inset-0"
                  initial={false}
                  animate={{ clipPath: i <= active ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }}
                  transition={{ duration: 1.1, ease: EASE_HOUSE }}
                >
                  <m.div
                    className="absolute inset-0"
                    initial={false}
                    animate={{ scale: i === active ? 1 : 1.12 }}
                    transition={{ duration: 1.6, ease: EASE_HOUSE }}
                  >
                    <Image src={image.src} alt={i === active ? image.alt : ""} fill sizes="50vw" placeholder={placeholderFor(image.src)} className={`object-cover ${focal(image).className}`} style={focal(image).style} />
                  </m.div>
                </m.div>
              ))}
              <p className="label absolute bottom-5 left-5 z-10 bg-ivory/85 px-2.5 py-1.5 text-ink">
                {String(active + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div className="px-5 sm:px-10 lg:px-16">
          {CHAPTERS.map((chapter, i) => (
            <m.article
              key={chapter.kicker}
              className="flex flex-col justify-center py-14 lg:min-h-screen lg:py-0"
              onViewportEnter={() => setActive(i)}
              viewport={{ amount: 0.55 }}
            >
              <ClipReveal className="relative mb-8 aspect-[4/5] w-full bg-bone lg:hidden">
                <Image src={MEDIA.story[i].src} alt={MEDIA.story[i].alt} fill sizes="100vw" placeholder={placeholderFor(MEDIA.story[i].src)} className={`object-cover ${focal(MEDIA.story[i]).className}`} style={focal(MEDIA.story[i]).style} />
              </ClipReveal>
              <Reveal>
                <p className="label text-clay">{chapter.kicker}</p>
                <h3 className="display mt-5 max-w-[14ch] text-[clamp(2rem,4.2vw,3.75rem)]">{chapter.title}</h3>
                <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ink/70">{chapter.body}</p>
              </Reveal>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  );
}
