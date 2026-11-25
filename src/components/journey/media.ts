import type React from "react";
import { campaignHero, campaignPhoto } from "@/lib/campaign-images";

export interface MediaSlot {
  src: string;
  alt: string;
  pos?: string;
  posMobile?: string;
}

function shot(name: string, alt: string, pos = "50% 35%"): MediaSlot {
  return { src: campaignPhoto(name), alt, pos };
}

/** Optional hero film. Leave undefined to use the campaign stills. */
export const HERO_VIDEO: string | undefined = undefined;

export function focal(slot: Pick<MediaSlot, "pos" | "posMobile">) {
  return {
    className: "[object-position:var(--pos-m)] lg:[object-position:var(--pos-d)]",
    style: { "--pos-d": slot.pos ?? "50% 50%", "--pos-m": slot.posMobile ?? slot.pos ?? "50% 50%" } as React.CSSProperties,
  };
}

const burgundy = shot("burgundy-robe-studio", "A man in a full-length burgundy robe in a warmly lit studio", "50% 32%");
const blue = shot("blue-geometric-set-full-length", "A man in a sky-blue tunic and trousers with a patterned cap");
const ivory = shot("ivory-textured-set-front", "A man wearing a textured ivory polo and matching trousers", "50% 26%");
const cap = shot("burgundy-striped-cap-profile", "A close-up of a folded cap in burgundy and grey stripes", "50% 18%");
const panel = shot("ivory-woven-panel-shirt-detail", "Diagonal burgundy and grey woven stripes across an ivory shirt", "50% 50%");
const trousers = shot("patterned-trousers-group-side", "Side views of three patterned trousers with contrasting panels and cuffs", "50% 55%");

export const MEDIA = {
  hero: campaignHero,
  heroMobile: burgundy,
  story: [
    panel,
    shot("burgundy-robe-detail", "Tonal detailing on a burgundy robe"),
    blue,
    shot("ivory-and-blue-sets", "Two men in coordinated ivory and blue outfits"),
  ],
  process: [
    shot("ivory-textured-set-side", "Side view of an ivory polo and matching trousers"),
    shot("patchwork-trousers-detail", "Bright woven panels on patchwork trousers", "50% 62%"),
    panel,
    shot("cobalt-striped-cuff-trousers-front", "Blue geometric trousers finished with striped cuffs", "50% 68%"),
  ],
  looks: [
    { ...campaignHero, title: "Patterned trousers" },
    { ...burgundy, title: "Burgundy robe" },
    { ...blue, title: "Sky-blue set" },
    { ...shot("ivory-and-blue-sets", "Two men in coordinated ivory and blue outfits", "50% 22%"), title: "Coordinated textures" },
    { ...shot("landscape-print-shirt-front", "A short-sleeve shirt with a green and gold landscape print"), title: "Landscape print shirt" },
  ],
  occasions: {
    wedding: burgundy,
    owambe: blue,
    office: ivory,
    weekend: shot("blue-abstract-shirt-front", "A blue abstract-print short-sleeve shirt"),
    bespoke: panel,
  },
  bespoke: shot("burgundy-robe-front", "A front view of the tonal embroidery on a burgundy robe", "50% 28%"),
  handoff: trousers,
  shopHero: trousers,
  aboutHero: shot("ivory-and-blue-sets", "Two men in coordinated ivory and blue outfits", "50% 20%"),
  aboutFounder: { src: "/images/brand/founder-portrait-laughing-amber.jpg", alt: "Motunrayo Odusina, founder of momen., laughing in a violet and blue printed top", pos: "50% 30%" },
  aboutFounderDetails: [
    { src: "/images/brand/founder-portrait-laughing-studio.jpg", alt: "Motunrayo Odusina laughing in a black and magenta printed peplum dress", pos: "55% 30%" },
    { src: "/images/brand/founder-portrait-hands-on-heart.jpg", alt: "Motunrayo Odusina with her hands on her heart", pos: "50% 30%" },
  ],
  aboutAtelier: shot("cobalt-striped-cuff-trousers-detail", "Striped aso-oke cuffs stitched onto cobalt Ankara trousers", "50% 55%"),
  madeToMeasureHero: shot("burgundy-robe-full-length", "A full-length burgundy robe styled with a black cap", "50% 25%"),
  shopFeatures: {
    wedding: burgundy,
    cloth: panel,
    bespoke: blue,
    accessories: cap,
  },
  emptyBag: shot("ivory-textured-set-portrait", "A man in a textured ivory polo with his arms crossed", "50% 25%"),
  footer: shot("patterned-trousers-trio", "Three pairs of Ankara pants with tan, patchwork and striped cuffs", "50% 60%"),
  auth: {
    login: shot("blue-geometric-set-portrait", "A man in a sky-blue kaftan with a geometric placket and matching cap", "50% 25%"),
    signup: shot("cobalt-trousers-duo-side", "Two men back to back in cobalt Ankara pants", "50% 30%"),
    recover: shot("burgundy-robe-full-length", "A full-length burgundy jalabia styled with a black fila", "50% 30%"),
  },
};
